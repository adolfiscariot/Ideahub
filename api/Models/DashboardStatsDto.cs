namespace api.Models;

public class DashboardStatsDto
{
    public int TotalIdeas { get; set; }
    public int OpenIdeas { get; set; }
    public int ClosedIdeas { get; set; }
    public int PromotedIdeas { get; set; }
    public int TotalGroups { get; set; }
}
