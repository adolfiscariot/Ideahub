using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class ValidateResetCodeDto
{
    [Required]
    [MaxLength(12)]
    public string Code { get; set; } = string.Empty;
}
