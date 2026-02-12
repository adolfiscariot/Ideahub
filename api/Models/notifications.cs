using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class Notification
{
    public int Id { get; set; }

    [Required]
    [ForeignKey("User")]
    public string RecipientId { get; set; } = string.Empty; 

    [Required]
    [ForeignKey("Comment")]
    public int CommentId { get; set; }

    [Required]
    public bool IsRead { get; set; } = false;

    // Navigation Properties
    public IdeahubUser User { get; set; } = null!;
    public Comment Comment { get; set; } = null!;
}
