using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class TaskUpdateDto
{
    [MaxLength(256)]
    public string? Title { get; set; }

    public string? Description { get; set; }

    [DataType(DataType.DateTime)]
    public DateTime? StartDate { get; set; }

    [DataType(DataType.DateTime)]
    public DateTime? EndDate { get; set; }

    [MaxLength(512)]
    public string? Labels { get; set; }

    public bool? IsCompleted { get; set; }

    public List<string>? TaskAssignees { get; set; }
}
