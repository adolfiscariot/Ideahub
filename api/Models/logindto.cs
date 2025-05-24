using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class LoginDto
{
    [Display(Name = "Email")]
    [Required(ErrorMessage = "Email is required")]
    [EmailAddress]
    public string Email {get; set;} = string.Empty;

    [Display(Name = "Password")]
    [Required(ErrorMessage = "Password is required")]
    [DataType(DataType.Password)]
    public string Password {get; set;} = string.Empty;
}