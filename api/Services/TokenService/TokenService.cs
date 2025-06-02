using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using api.Helpers;
using api.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace api.Services;

public class TokenService : ITokenService
{
    //configuration to access user secrets
    private readonly IConfiguration _configuration;
    private readonly UserManager<IdeahubUser> _userManager;
    private readonly ILogger<TokenService> _logger;

    public TokenService(IConfiguration configuration, UserManager<IdeahubUser> userManager, ILogger<TokenService> logger)
    {
        _configuration = configuration;
        _userManager = userManager;
        _logger = logger;
    }

    //create access token
    public async Task<string> CreateAccessTokenAsync(IdeahubUser user)
    {
        var JwtKey = _configuration["Jwt:Key"]
            ?? throw new Exception("JWT Key Not Found!");

        //Convert key from hex string to byte array
        var secretKey = JwtHexToBytes.FromHexToBytes(JwtKey);

        var JwtIssuer = _configuration["Jwt:Issuer"]
            ?? throw new Exception("Jwt Issuer Not Found");

        var JwtAudience = _configuration["Jwt:Audience"]
            ?? throw new Exception("Jwt Audience Not Found");

        var JwtExpiry = _configuration.GetValue<int>("Jwt:Expiry", 15);

        var roles = await _userManager.GetRolesAsync(user);

        if (string.IsNullOrWhiteSpace(user.Email))
        {
            _logger.LogError("Email not found");
            throw new Exception("Email not found") ;
        }
        
        //data to be used in the token's payload
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.DisplayName),
            new Claim(JwtRegisteredClaimNames.Iss, JwtIssuer),
            new Claim(JwtRegisteredClaimNames.Aud, JwtAudience),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        //add roles to claims
        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        //create secret key for signing the token. 
        var key = new SymmetricSecurityKey(secretKey);

        //which algorithm to use with which key
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        //create the token. returns a C# object.
        var token = new JwtSecurityToken(
            issuer: JwtIssuer,
            audience: JwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(JwtExpiry),
            signingCredentials: credentials
        );

        //finally serialize the token from a C# object to a string
        var serializedToken = new JwtSecurityTokenHandler().WriteToken(token);

        return serializedToken;
    }

    //Generate a refresh token
    public string GenerateRefreshToken()
    {
        //create 32 byte array
        var randomNumber = new byte[32];

        //create a random number
        using var randomNumberGenerator = RandomNumberGenerator.Create();

        //convert the random number into bytes and put it in the array
        randomNumberGenerator.GetBytes(randomNumber);

        //convert to base 64 string and return
        return Convert.ToBase64String(randomNumber);
    }

    //store refresh token
    public async Task<IdentityResult> StoreRefreshTokenAsync(string userId, string refreshToken, DateTime expiry)
    {
        //check if user exists
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            _logger.LogError("User Not Found");
            throw new Exception("User Not Found");
        }

        //if all is well hash the token 
        var encodedToken = Encoding.UTF8.GetBytes(refreshToken);
        var hashedToken = Convert.ToBase64String(
            SHA256.HashData(encodedToken)
        );

        //add token to list of user's refresh tokens  
        user.RefreshTokens.Add(new RefreshToken
        {
            Token = hashedToken,
            TokenId = Guid.NewGuid().ToString(),
            RefreshTokenExpiry = DateTime.UtcNow.AddDays(7),
            HasExpired = false
        });

        //save
        return await _userManager.UpdateAsync(user);
    }

    public ClaimsPrincipal GetPrincipalFromExpiredToken(string token)
    {
        var JwtKey = _configuration["Jwt:Key"]
            ?? throw new Exception("JWT Key Not Found!");

        //Convert hex string into byte array
        var secretKey = JwtHexToBytes.FromHexToBytes(JwtKey);

        //define token validation parameters
        var tokenValidationParameters = new TokenValidationParameters
        {

            ValidateIssuer = true,
            ValidIssuer = _configuration["Jwt:Issuer"],

            ValidateAudience = true,
            ValidAudience = _configuration["Jwt:Audience"],

            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(secretKey),

            ValidateLifetime = false //allow expired tokens
        };

        try
        {
            //validate the token
            var tokenHandler = new JwtSecurityTokenHandler();
            var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out SecurityToken securityToken);

            //return the principal
            _logger.LogInformation("Token Validated");
            return principal;
        }
        catch (Exception e)
        {
            _logger.LogWarning("Invalid token: {Message}", e.Message);
            return null!; //Uses the null forgiving operator(!) aka "I know this is null but trust me its ok"
        }
    }

    //Revoke Refresh tokens during logout
    public async Task RevokeRefreshTokenAsync(string userId)
    {
        var user = await _userManager.Users.Include(u => u.RefreshTokens).FirstOrDefaultAsync(u => u.Id == userId);
        if (user != null)
        {
            foreach (var token in user.RefreshTokens.Where(t => t.HasExpired == false))
            {
                token.HasExpired = true;
            }
            await _userManager.UpdateAsync(user);
        }
    }
}

