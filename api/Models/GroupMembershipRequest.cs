using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class GroupMembershipRequest
{
    public int Id { get; set; }

    [Required]
    public string UserId { get; set; } = string.Empty;

    [Required]
    public int GroupId { get; set; }

    [Required]
    public Status Status { get; set; } = Status.Pending;

    [Required]
    [DataType(DataType.DateTime)]
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;

    [DataType(DataType.DateTime)]
    public DateTime? AcceptedOrRejectedAt { get; set; } 

    //Navigation properties
    public Group Group { get; set; } = null!;
    public IdeahubUser User { get; set; } = null!;
}
public enum Status
{
    Pending = 0,
    Approved = 1, 
    Rejected = 2
}