using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class ForgotPasswordDto 
{ 
    [Display(Name = "Email")] 
    [Required(ErrorMessage = "Email is required")] 
    [EmailAddress] public string Email {get; set;} = string.Empty; 
    
}