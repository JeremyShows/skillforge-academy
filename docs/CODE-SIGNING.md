# Code signing (Windows)

Release builds are currently **unsigned**, so Windows SmartScreen shows an
"unrecognized publisher" warning on launch/install. This document explains how
to sign the installer and what each option actually buys you.

## TL;DR

```powershell
npm run desktop:build
./scripts/sign-windows.ps1 -Thumbprint <your-cert-thumbprint>
```

The script signs both `skillforge-academy.exe` and the NSIS `*_x64-setup.exe` with an
RFC 3161 timestamp. Re-run it after every build (signing happens after bundling).

## What removes the SmartScreen warning?

| Certificate | Removes "unknown publisher" | Notes |
| --- | --- | --- |
| **EV Authenticode** (CA-issued) | Yes, immediately | Hardware-token; best SmartScreen reputation from day one. Paid. |
| **OV Authenticode** (CA-issued) | Eventually | Warning fades as download reputation accrues. Paid. |
| **Self-signed** | Only on machines that trust it | Free, but each machine must install the cert into Trusted Root + Trusted Publishers. Fine for your own/managed PCs; useless for public distribution. |

There is no free way to clear SmartScreen for arbitrary downloaders — that
requires a CA-issued (ideally EV) certificate, which must be purchased and is
tied to a validated identity. Obtaining one is a manual, paid step you perform.

### New to this? What it costs

Code signing is not a setting you toggle — it requires a **certificate that you
buy from a Certificate Authority**, which first validates that you (or your
company) are who you claim to be. Rough options, cheapest-trust-first:

- **Azure Trusted Signing** — ~**$10/month**, SmartScreen-trusted, designed for
  CI. The modern recommended path; no hardware token. Requires an Azure
  subscription and an identity validation step.
- **OV certificate** (DigiCert/Sectigo/SSL.com, etc.) — ~**$100–300/year**.
  SmartScreen warning fades as your downloads build reputation (not instant).
- **EV certificate** — ~**$250–500/year**, usually on a hardware token (or
  cloud HSM). Best SmartScreen reputation immediately.
- **Self-signed** — free, but only removes the warning on machines where you
  personally install the certificate. Fine for your own PCs, useless for the
  public.

You do not need any of this to keep shipping — releases build and run unsigned,
users just see the "unknown publisher" prompt and click through. Sign when
distribution reach matters enough to justify the cost.

## Automated signing in GitHub Actions

The release workflow signs the installer automatically **once two repository
secrets exist** — until then it builds unsigned, so nothing breaks while you
decide on a certificate.

1. Export your code-signing certificate to a password-protected `.pfx`.
2. Base64-encode it:
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes(".\mycert.pfx")) | Set-Content cert.b64
   ```
3. Add the two secrets (Settings → Secrets and variables → Actions), or via the CLI:
   ```powershell
   gh secret set WINDOWS_PFX_BASE64 --repo ForgeWireLabs/skillforge-academy < cert.b64
   gh secret set WINDOWS_PFX_PASSWORD --repo ForgeWireLabs/skillforge-academy --body "<pfx-password>"
   ```
4. Cut a release as usual (push a `vX.Y.Z` tag). The `release` job decodes the
   PFX, runs `scripts/sign-windows.ps1`, and replaces the uploaded installer with
   the signed one; the published `SHA256SUMS.txt` then reflects the signed file.

Delete the local `cert.b64`/`.pfx` afterward — the secret store is the only copy
CI needs. (Azure Trusted Signing uses a different, token-less mechanism; wiring
that into the workflow is a follow-up if you choose that route.)

## Option A — CA-issued certificate (for distribution)

1. Buy an OV or EV code-signing certificate (DigiCert, Sectigo, etc.) and
   complete identity validation.
2. Install it into your certificate store (EV certs live on a hardware token)
   and note the **thumbprint**:
   ```powershell
   Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Format-List Subject, Thumbprint
   ```
3. Build and sign:
   ```powershell
   npm run desktop:build
   ./scripts/sign-windows.ps1 -Thumbprint <thumbprint>
   ```

### Optional: sign automatically during `tauri build`

Add the thumbprint to `src-tauri/tauri.conf.json` so Tauri signs as part of the
bundle step (leave it out to keep builds unsigned):

```jsonc
"bundle": {
  "windows": {
    "certificateThumbprint": "<thumbprint>",
    "digestAlgorithm": "sha256",
    "timestampUrl": "http://timestamp.digicert.com"
  }
}
```

## Option B — Self-signed (your own machines only)

Removes the warning **only** on machines where you install the certificate.
Run these yourself — they create a certificate and change trust stores, which
is a security decision that should be made by the machine's owner.

```powershell
# 1. Create a self-signed code-signing certificate
$cert = New-SelfSignedCertificate -Type CodeSigningCert `
  -Subject "CN=SkillForge Academy Test Certificate" `
  -CertStoreLocation Cert:\CurrentUser\My `
  -KeyUsage DigitalSignature -KeyExportPolicy Exportable `
  -NotAfter (Get-Date).AddYears(3)

# 2. Sign the build with it
./scripts/sign-windows.ps1 -Thumbprint $cert.Thumbprint

# 3. To trust it on THIS machine, export the public cert and import it into
#    LocalMachine Trusted Root + Trusted Publishers (requires admin):
Export-Certificate -Cert $cert -FilePath skillforge-selfsign.cer
Import-Certificate -FilePath skillforge-selfsign.cer -CertStoreLocation Cert:\LocalMachine\Root
Import-Certificate -FilePath skillforge-selfsign.cer -CertStoreLocation Cert:\LocalMachine\TrustedPublisher
```

## Verify a signature

```powershell
Get-AuthenticodeSignature ".\src-tauri\target\release\bundle\nsis\SkillForge Academy_1.3.0_x64-setup.exe" | Format-List
```

`Status` should be `Valid` once the signing certificate is trusted by the machine.
