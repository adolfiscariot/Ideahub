using System;

namespace api.Models;

public class TimesheetDetailsDto
{
    public int Id { get; set; }
    public int TaskId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public DateTime WorkDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal HoursSpent { get; set; }
    public string? Comments { get; set; }
    public bool HasBlocker { get; set; }
    public string? BlockerDescription { get; set; }
    public BlockerSeverity? BlockerSeverity { get; set; }
    public DateTime CreatedAt { get; set; }
    public int? MediaCount { get; set; }
}
