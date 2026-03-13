using System;
using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class TimesheetUpdateDto
{
    public DateTime? WorkDate { get; set; }

    [MaxLength(1000)]
    public string? Description { get; set; }

    [Range(0.1, 24)]
    public decimal? HoursSpent { get; set; }

    public string? Comments { get; set; }

    public bool? HasBlocker { get; set; }

    public string? BlockerDescription { get; set; }

    public BlockerSeverity? BlockerSeverity { get; set; }
}
