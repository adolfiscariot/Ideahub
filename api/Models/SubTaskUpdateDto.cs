using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class SubTaskUpdateDto
{
    [MaxLength(256)]
    public string? Title { get; set; }

    public string? Description { get; set; }

    [DataType(DataType.DateTime)]
    public DateTime? StartDate { get; set; }

    [DataType(DataType.DateTime)]
    public DateTime? EndDate { get; set; }

    public bool? IsCompleted { get; set; }

    public List<string>? SubTaskAssignees { get; set; }
}
