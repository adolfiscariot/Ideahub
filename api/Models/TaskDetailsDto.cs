using System;
using System.Collections.Generic;

namespace api.Models;

public class TaskDetailsDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string Labels { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public List<string> TaskAssignees { get; set; } = new List<string>();
    public int ProjectId { get; set; }
    public List<SubTaskDetailsDto> SubTasks { get; set; } = new List<SubTaskDetailsDto>();
    public int MediaCount { get; set; }
}
