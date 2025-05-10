using System.ComponentModel.DataAnnotations;
namespace api.Models;

public class RegisterDto
{
    [Display(Name = "Display Name")]
    [Required(ErrorMessage = "Display Name is required")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "Name should be 3 - 50 characters long")]
    public string DisplayName {get; set;} = string.Empty;
    
    [Display(Name = "Email")]
    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Email format is incorrect")]
    public string Email {get; set;} = string.Empty; 

    [Display(Name = "Password")]
    [Required(ErrorMessage = "Password is required")]
    [DataType(DataType.Password)]
    [MinLength(8, ErrorMessage = "Password should be at least 8 characters long")]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$", 
        ErrorMessage = "Password should include a uppercase, lowercase, number and special character")]
    public string Password {get; set;} = string.Empty;

    [Display(Name = "Confirm Password")]
    [Required(ErrorMessage = "You must confirm your password")]
    [DataType(DataType.Password)]
    [Compare("Password", ErrorMessage = "Passwords don't match")]
    public string ConfirmPassword {get; set;} = string.Empty;
}