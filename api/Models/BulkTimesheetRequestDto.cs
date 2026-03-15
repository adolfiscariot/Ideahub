using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class BulkTimesheetRequestDto
{
    [Required]
    public List<TimesheetDto> Logs { get; set; } = new List<TimesheetDto>();
}
