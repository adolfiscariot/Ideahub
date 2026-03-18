using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class SubTask
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

    public bool IsCompleted { get; set; } = false;
    
    public bool IsDeleted { get; set; } = false;

    // Foreign Keys
    [Required]
    [ForeignKey("ProjectTask")]
    public int ProjectTaskId { get; set; }

    public int? ParentSubTaskId { get; set; }

    // Navigation Properties
    public ProjectTask ProjectTask { get; set; } = null!;
    
    public SubTask? ParentSubTask { get; set; }
    
    public ICollection<SubTask> ChildSubTasks { get; set; } = new List<SubTask>();
    public ICollection<Media> Media { get; set; } = new List<Media>();
    public ICollection<SubTaskAssignee> SubTaskAssignees { get; set; } = new List<SubTaskAssignee>();
}
