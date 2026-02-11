using System.Security.Cryptography;
using System.Text;
using api.Data;
using api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace api.Services;

public class PasswordResetService : IPasswordResetService
{
    private readonly IdeahubDbContext _context;
    private readonly UserManager<IdeahubUser> _userManager;
    private readonly ILogger<PasswordResetService> _logger;

    private const int CodeExpiryMinutes = 10;
    private const int CodeLength = 12;

    private static readonly char[] AllowedChars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".ToCharArray(); 

    public PasswordResetService(
        IdeahubDbContext context,
        UserManager<IdeahubUser> userManager,
        ILogger<PasswordResetService> logger
    )
    {
        _context = context;
        _userManager = userManager;
        _logger = logger;
    }

    // Generate OTP reset code and stores its hash
    public async Task<(string code, bool success)> GeneratePasswordResetCodeAsync(string userId)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                _logger.LogWarning("Password reset requested for non-existent user {UserId}", userId);
                return (string.Empty, false);
            }

            var code = GenerateCode();
            var codeHash = HashResetCode(code);

            // Invalidate previous unused codes
            var previousCodes = await _context.PasswordResets
                .Where(pr => pr.UserId == userId && !pr.Used && pr.ExpiresAt > DateTime.UtcNow)
                .ToListAsync();

            foreach (var reset in previousCodes)
            {
                reset.Used = true;
                reset.UsedAt = DateTime.UtcNow;
            }

            var passwordReset = new PasswordReset
            {
                UserId = userId,
                Code = codeHash,
                ExpiresAt = DateTime.UtcNow.AddMinutes(CodeExpiryMinutes),
                CreatedAt = DateTime.UtcNow,
                Used = false
            };

            _context.PasswordResets.Add(passwordReset);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Password reset code generated for user {UserId}", userId);
            return (code, true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating password reset code for user {UserId}", userId);
            return (string.Empty, false);
        }
    }

    // Validates code and resets password (marks code as used)
    public async Task<(bool success, string error)> ValidateCodeAndResetPasswordAsync(
    string code,
    string newPassword)
    {
        try
        {
            // Hash the code for lookup
            var codeHash = HashResetCode(code);

            // Find the reset record (same conditions as validation)
            var resetRecord = await _context.PasswordResets
                .FirstOrDefaultAsync(pr =>
                    pr.Code == codeHash &&
                    !pr.Used &&
                    pr.ExpiresAt > DateTime.UtcNow
                );

            if (resetRecord == null)
                return (false, "Invalid or expired reset code");

            // Get the user
            var user = await _userManager.FindByIdAsync(resetRecord.UserId);
            if (user == null)
                return (false, "User not found");

            // Reset password
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var result = await _userManager.ResetPasswordAsync(user, token, newPassword);

            if (!result.Succeeded)
                return (false, result.Errors.FirstOrDefault()?.Description ?? "Password reset failed");

            // Mark code as used
            resetRecord.Used = true;
            resetRecord.UsedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return (true, string.Empty);
        }
        catch (Exception ex)
        {
            _logger.LogError("Error resetting password for code {Code}: {Error}", code, ex.Message);
            return (false, "An unexpected error occurred");
        }
    }


    // ================= HELPERS =================

    private static string GenerateCode()
    {
        var bytes = new byte[CodeLength];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);

        var chars = new char[CodeLength];
        for (int i = 0; i < CodeLength; i++)
        {
            chars[i] = AllowedChars[bytes[i] % AllowedChars.Length];
        }

        return new string(chars);
    }

    private static string HashResetCode(string code)
    {
        using var sha = SHA256.Create();
        var hash = sha.ComputeHash(Encoding.UTF8.GetBytes(code));
        return Convert.ToBase64String(hash);
    }
}
