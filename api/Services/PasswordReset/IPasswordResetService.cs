using api.Models;

namespace api.Services;

public interface IPasswordResetService
{
    Task<(string code, bool success)> GeneratePasswordResetCodeAsync(string userId);
    Task<(bool success, string error)> ValidateCodeAndResetPasswordAsync(
        string code,
        string newPassword
    );
}
