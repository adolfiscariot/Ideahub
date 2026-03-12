using System;
using System.Collections.Generic;

namespace api.Models;

public class SubTaskDetailsDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsCompleted { get; set; }
    public List<string> AssigneeIds { get; set; } = new List<string>();
    public int ProjectTaskId { get; set; }
    public int MediaCount { get; set; }
}
