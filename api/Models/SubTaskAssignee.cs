using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class SubTaskAssignee
{
    public int Id { get; set; }

    [Required]
    public int SubTaskId { get; set; }
    public SubTask? SubTask { get; set; }

    [Required]
    public required string UserId { get; set; } = null!;
    public IdeahubUser? User { get; set; } 

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}