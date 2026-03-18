public class TaskAssignee
{
    public int Id { get; set; }

    public int TaskId { get; set; }
    public ProjectTask Task { get; set; }

    public int UserId { get; set; }
    public User User { get; set; }

    public DateTime CreatedAt { get; set; }
}