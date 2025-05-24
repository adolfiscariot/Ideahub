using System.ComponentModel.DataAnnotations;
namespace api.Models;

public class TokenResponse
{
    [Required]
    public string AccessToken { get; set; } = string.Empty;

    [Required]
    public string RefreshToken { get; set; } = string.Empty;

    [Required]
    [DataType(DataType.DateTime)]
    public DateTime RefreshTokenExpiry { get; set; } 
}