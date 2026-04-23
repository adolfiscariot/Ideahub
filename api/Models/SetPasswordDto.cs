using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class SetPasswordDto
{
    [Display(Name = "Password")]
    [Required(ErrorMessage = "Password is required")]
    [DataType(DataType.Password)]
    [MinLength(8, ErrorMessage = "Password should be at least 8 characters long")]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$",
        ErrorMessage = "Password should include a uppercase, lowercase, number and special character")]
    public string NewPassword { get; set; } = string.Empty;

    [Display(Name = "Confirm Password")]
    [Required(ErrorMessage = "You must confirm your password")]
    [DataType(DataType.Password)]
    [Compare("NewPassword", ErrorMessage = "Passwords don't match")]
    public string ConfirmPassword { get; set; } = string.Empty;
}
