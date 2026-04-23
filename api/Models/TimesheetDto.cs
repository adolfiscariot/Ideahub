using System;
using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class TimesheetDto
{
    public int? Id { get; set; }
    public int? TaskId { get; set; }
    public string? TaskTitle { get; set; }
    public string? UserName { get; set; }

    [Required]
    public DateTime WorkDate { get; set; }

    [Required]
    [MaxLength(150)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [Range(0.1, 24)]
    public decimal HoursSpent { get; set; }

    public string? Comments { get; set; }

    public bool HasBlocker { get; set; } = false;

    [MaxLength(150)]
    public string? BlockerDescription { get; set; }

    public BlockerSeverity? BlockerSeverity { get; set; }

    public DateTime? CreatedAt { get; set; }
    public int? MediaCount { get; set; }
    public string? UserId { get; set; }
}
