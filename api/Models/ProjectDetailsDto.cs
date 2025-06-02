using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class ProjectDetailsDto
{
    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty; 

    public string OverseenByUserName { get; set; } = string.Empty;

    public string IdeaName { get; set; } = string.Empty;

    public string GroupName { get; set; } = string.Empty;
}