using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class Timesheet
{
    public int Id { get; set; }

    [Required]
    [ForeignKey("ProjectTask")]
    public int TaskId { get; set; }

    [Required]
    [ForeignKey("User")]
    public string UserId { get; set; } = string.Empty;

    [Required]
    [DataType(DataType.Date)]
    public DateTime WorkDate { get; set; }

    [Required]
    [Column(TypeName = "text")]
    public string Description { get; set; } = string.Empty;

    [Required]
    [Range(0, 24)]
    public decimal HoursSpent { get; set; }

    [Column(TypeName = "text")]
    public string? Comments { get; set; }

    public bool HasBlocker { get; set; } = false;

    [MaxLength(150)]
    [Column(TypeName = "text")]
    public string? BlockerDescription { get; set; }

    public BlockerSeverity? BlockerSeverity { get; set; }

    public bool IsDeleted { get; set; } = false;

    [Required]
    [DataType(DataType.DateTime)]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    [DataType(DataType.DateTime)]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public ProjectTask Task { get; set; } = null!;
    public IdeahubUser User { get; set; } = null!;
    public ICollection<Media>? Media { get; set; }
}

public enum BlockerSeverity
{
    Low = 0,
    Medium = 1,
    High = 2
}
