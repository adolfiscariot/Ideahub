public class SubTaskAssignee
{
    public int Id { get; set; }

    public int SubTaskId { get; set; }
    public SubTask SubTask { get; set; }

    public int UserId { get; set; }
    public User User { get; set; }

    public DateTime CreatedAt {get;set;}
}