using api.Data;
using api.Models;
using api.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using System.Security.Claims;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly IdeahubDbContext _context;
    private readonly ILogger<AnalyticsController> _logger;
    private readonly UserManager<IdeahubUser> _userManager;

    public AnalyticsController(IdeahubDbContext context, ILogger<AnalyticsController> logger, UserManager<IdeahubUser> userManager)
    {
        _context = context;
        _logger = logger;
        _userManager = userManager;
    }

    [HttpGet("most-voted")]
    public async Task<IActionResult> GetMostVotedIdeas()
    {
        try
        {
            var ideas = await _context.Ideas
                .Include(i => i.Votes)
                .Include(i => i.User)
                .Include(i => i.Group)
                .Where(i => !i.IsDeleted)
                .OrderByDescending(i => i.Votes.Count(v => !v.IsDeleted))
                .Take(5)
                .Select(i => new
                {
                    i.Id,
                    i.Title,
                    i.Description,
                    Author = i.User.DisplayName,
                    GroupName = i.Group.Name,
                    VoteCount = i.Votes.Count(v => !v.IsDeleted)
                })
                .ToListAsync();

            return Ok(ApiResponse.Ok("Most voted ideas", ideas));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching most voted ideas");
            return StatusCode(500, ApiResponse.Fail("Internal server error"));
        }
    }

    [HttpGet("top-contributors")]
    public async Task<IActionResult> GetTopContributors()
    {
        try
        {
            var contributors = await _context.Users
                .Where(u => !u.IsDeleted)
                .Select(u => new
                {
                    u.DisplayName,
                    u.Email,
                    IdeaCount = u.Ideas.Count(i => !i.IsDeleted)
                })
                .Where(x => x.IdeaCount > 0)
                .OrderByDescending(x => x.IdeaCount)
                .Take(5)
                .ToListAsync();

            return Ok(ApiResponse.Ok("Top contributors", contributors));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching top contributors");
            return StatusCode(500, ApiResponse.Fail("Internal server error"));
        }
    }

    [HttpGet("promoted-ideas")]
    public async Task<IActionResult> GetPromotedIdeas()
    {
        try
        {
            var ideas = await _context.Ideas
                .Include(i => i.User)
                .Include(i => i.Group)
                .Where(i => i.IsPromotedToProject && !i.IsDeleted)
                .OrderByDescending(i => i.UpdatedAt)
                .Take(5)
                .Select(i => new
                {
                    i.Id,
                    i.Title,
                    i.Description,
                    Author = i.User.DisplayName,
                    GroupName = i.Group.Name,
                    PromotedDate = i.UpdatedAt
                })
                .ToListAsync();

            return Ok(ApiResponse.Ok("Promoted ideas", ideas));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching promoted ideas");
            return StatusCode(500, ApiResponse.Fail("Internal server error"));
        }
    }

    [HttpGet("idea-statistics")]
    public async Task<IActionResult> GetIdeaStatistics()
    {
        try
        {
            var totalIdeas = await _context.Ideas.CountAsync(i => !i.IsDeleted);
            var openIdeas = await _context.Ideas.CountAsync(i => !i.IsDeleted && i.Status == IdeaStatus.Open);
            var promotedIdeas = await _context.Ideas.CountAsync(i => !i.IsDeleted && i.IsPromotedToProject);
            var closedIdeas = await _context.Ideas.CountAsync(i => !i.IsDeleted && i.Status == IdeaStatus.Closed);

            var stats = new
            {
                Total = totalIdeas,
                Open = openIdeas,
                Promoted = promotedIdeas,
                Closed = closedIdeas
            };

            return Ok(ApiResponse.Ok("Idea statistics", stats));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching idea statistics");
            return StatusCode(500, ApiResponse.Fail("Internal server error"));
        }
    }

    [HttpGet("group-engagement")]
    public async Task<IActionResult> GetGroupEngagement()
    {
        try
        {
            var groups = await _context.Groups
                .Where(g => !g.IsDeleted && g.IsActive)
                .Select(g => new
                {
                    g.Name,
                    IdeaCount = g.Ideas.Count(i => !i.IsDeleted),
                    VoteCount = g.Ideas.SelectMany(i => i.Votes).Count(v => !v.IsDeleted)
                })
                .OrderByDescending(g => g.IdeaCount + g.VoteCount)
                .Take(5)
                .ToListAsync();

            return Ok(ApiResponse.Ok("Group engagement", groups));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching group engagement");
            return StatusCode(500, ApiResponse.Fail("Internal server error"));
        }
    }

    [HttpGet("personal-stats")]
    public async Task<IActionResult> GetPersonalStats()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse.Fail("User not authenticated"));
            }

            var ideasCreated = await _context.Ideas.CountAsync(i => i.UserId == userId && !i.IsDeleted);
            var votesCast = await _context.Votes.CountAsync(v => v.UserId == userId && !v.IsDeleted);
            var projectsInvolved = await _context.Projects.CountAsync(p => !p.IsDeleted && (p.CreatedByUserId == userId || p.OverseenByUserId == userId));

            var stats = new
            {
                IdeasCreated = ideasCreated,
                VotesCast = votesCast,
                ProjectsInvolved = projectsInvolved
            };

            return Ok(ApiResponse.Ok("Personal statistics", stats));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching personal statistics");
            return StatusCode(500, ApiResponse.Fail("Internal server error"));
        }
    }
}
