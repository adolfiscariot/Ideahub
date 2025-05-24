using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace api.Models;

public class RefreshToken
{
    [Required]
    public string Token { get; set; } = string.Empty;

    [Required]
    [DataType(DataType.DateTime)]
    public DateTime RefreshTokenExpiry { get; set; }

    [Required]
    public string TokenId { get; set; } = string.Empty;

    [Required]
    public bool HasExpired { get; set; }


    [Required]
    public string UserId { get; set; } = string.Empty;

    [ForeignKey(nameof(UserId))]
    public IdeahubUser User { get; set; }
}