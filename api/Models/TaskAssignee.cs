using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class TaskAssignee
{
    public int Id { get; set; }

    [Required]
    public int ProjectTaskId { get; set; }
    public ProjectTask? ProjectTask { get; set; }

    [Required]
    public required string UserId { get; set; } = null!;
    public IdeahubUser? User { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}