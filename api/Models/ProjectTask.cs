using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class ProjectTask
{
    public int Id { get; set; }

    [Required]
    [MaxLength(256)]
    public string Title { get; set; } = string.Empty;

    [Column(TypeName = "text")]
    public string Description { get; set; } = string.Empty;

    [DataType(DataType.DateTime)]
    public DateTime? StartDate { get; set; }

    [DataType(DataType.DateTime)]
    public DateTime? EndDate { get; set; }

    [MaxLength(512)]
    public string Labels { get; set; } = string.Empty;

    public bool IsCompleted { get; set; } = false;

    public bool IsDeleted { get; set; } = false;

    [Required]
    [DataType(DataType.DateTime)]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    [DataType(DataType.DateTime)]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<string> AssigneeIds { get; set; } = new List<string>();

    // Foreign Keys
    [Required]
    [ForeignKey("Project")]
    public int ProjectId { get; set; }

    // Navigation Properties
    public Project Project { get; set; } = null!;
    public ICollection<SubTask> SubTasks { get; set; } = new List<SubTask>();
    public ICollection<Media> Media { get; set; } = new List<Media>();
    public ICollection<Timesheet> Timesheets { get; set; } = new List<Timesheet>();
}
