using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class ResetPasswordDto
{

    [Required]
    [MinLength(12)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string NewPassword { get; set; } = string.Empty;

    [Required]
    [Compare("NewPassword", ErrorMessage = "Passwords do not match")]
    public string ConfirmPassword { get; set; } = string.Empty;
}
