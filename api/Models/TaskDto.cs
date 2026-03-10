using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class TaskDto
{
    [Required]
    [MaxLength(256)]
    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    [DataType(DataType.DateTime)]
    public DateTime? StartDate { get; set; }

    [DataType(DataType.DateTime)]
    public DateTime? EndDate { get; set; }

    [MaxLength(512)]
    public string Labels { get; set; } = string.Empty;

    public List<string> AssigneeIds { get; set; } = new List<string>();
}
