using System.Security.Claims;
using api.Models;
using Microsoft.AspNetCore.Identity;

namespace api.Services;
public interface ITokenService
{
    Task<string> CreateAccessTokenAsync(IdeahubUser user);
    string GenerateRefreshToken();
    Task<IdentityResult> StoreRefreshTokenAsync(string userId, string refreshToken, DateTime expiry);
    ClaimsPrincipal GetPrincipalFromExpiredToken(string token);
    Task RevokeRefreshTokenAsync(string userId);
}