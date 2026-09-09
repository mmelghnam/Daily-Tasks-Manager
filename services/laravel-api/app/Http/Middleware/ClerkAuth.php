<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class ClerkAuth
{
    /**
     * Verify a Clerk JWT without adding a third-party JWT package.
     *
     * Clerk's public keys are fetched from CLERK_JWKS_URL and cached in the
     * Laravel cache. The authenticated Clerk subject is exposed as userId,
     * matching the existing Node API contract.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $authorization = $request->header('Authorization', '');
        if (!preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches)) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $claims = $this->decodeAndVerify($matches[1]);
        if (!is_array($claims) || empty($claims['sub'])) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $request->attributes->set('userId', (string) $claims['sub']);
        $this->provisionUser((string) $claims['sub']);

        return $next($request);
    }

    private function provisionUser(string $userId): void
    {
        DB::transaction(function () use ($userId): void {
            DB::table('app_users')->insertOrIgnore([
                'user_id' => $userId,
                'created_at' => now(),
            ]);

            $claimed = DB::table('app_settings')->insertOrIgnore([
                'key' => 'legacy_ownership_claimed',
                'value' => $userId,
                'created_at' => now(),
            ]);

            if ($claimed === 1) {
                foreach (['daily_tasks', 'task_spaces', 'countdown_events', 'space_links'] as $table) {
                    DB::table($table)->whereNull('owner_id')->update(['owner_id' => $userId]);
                }
            }
        });
    }

    /**
     * Verify RS256 JWTs using the standard-library OpenSSL extension.
     *
     * This intentionally fails closed when Clerk configuration is absent.
     */
    private function decodeAndVerify(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;
        $header = json_decode($this->base64UrlDecode($encodedHeader), true);
        $payload = json_decode($this->base64UrlDecode($encodedPayload), true);
        $signature = $this->base64UrlDecode($encodedSignature);

        if (!is_array($header) || !is_array($payload) || !is_string($signature)) {
            return null;
        }

        if (($header['alg'] ?? null) !== 'RS256' || empty($header['kid'])) {
            return null;
        }

        if (isset($payload['exp']) && (int) $payload['exp'] < time()) {
            return null;
        }

        $issuer = config('services.clerk.issuer');
        if ($issuer && ($payload['iss'] ?? null) !== $issuer) {
            return null;
        }

        $jwksUrl = config('services.clerk.jwks_url');
        if (!$jwksUrl) {
            return null;
        }

        $jwks = cache()->remember('clerk.jwks', now()->addHours(6), function () use ($jwksUrl) {
            $response = Http::timeout(5)->get($jwksUrl);
            return $response->successful() ? $response->json() : null;
        });

        $key = collect($jwks['keys'] ?? [])->firstWhere('kid', $header['kid']);
        if (!is_array($key) || ($key['kty'] ?? null) !== 'RSA') {
            return null;
        }

        $publicKey = $this->rsaPublicKey($key['n'] ?? '', $key['e'] ?? '');
        if (!$publicKey || openssl_verify(
            $encodedHeader.'.'.$encodedPayload,
            $signature,
            $publicKey,
            OPENSSL_ALGO_SHA256,
        ) !== 1) {
            return null;
        }

        return $payload;
    }

    private function base64UrlDecode(string $value): string
    {
        return base64_decode(strtr($value, '-_', '+/').'==', true) ?: '';
    }

    private function rsaPublicKey(string $modulus, string $exponent): ?string
    {
        if ($modulus === '' || $exponent === '') {
            return null;
        }

        $modulus = $this->base64UrlDecode($modulus);
        $exponent = $this->base64UrlDecode($exponent);
        $modulus = $this->derInteger($modulus);
        $exponent = $this->derInteger($exponent);
        $rsa = "\x30".$this->derLength(strlen($modulus) + strlen($exponent))
            .$modulus.$exponent;
        $algorithm = "\x30\x0d\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01\x05\x00";
        $bitString = "\x03".$this->derLength(strlen($rsa) + 1)."\x00".$rsa;
        $sequence = "\x30".$this->derLength(strlen($algorithm) + strlen($bitString))
            .$algorithm.$bitString;

        return "-----BEGIN PUBLIC KEY-----\n"
            .chunk_split(base64_encode($sequence), 64, "\n")
            ."-----END PUBLIC KEY-----\n";
    }

    private function derInteger(string $value): string
    {
        return ($value !== '' && (ord($value[0]) & 0x80) ? "\x00" : '').$value;
    }

    private function derLength(int $length): string
    {
        if ($length < 128) {
            return chr($length);
        }

        $result = '';
        while ($length > 0) {
            $result = chr($length & 0xff).$result;
            $length >>= 8;
        }

        return chr(0x80 | strlen($result)).$result;
    }
}