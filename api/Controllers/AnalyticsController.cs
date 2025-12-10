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

    /// <summary>
    /// Gets the top 5 most voted ideas that are not deleted.
    /// </summary>
    /// <returns>A list of ideas with their vote counts, authors, and group information.</returns>
    /// <response code="200">Returns the most voted ideas successfully.</response>
    /// <response code="500">Internal server error occurred.</response>
    [HttpGet("most-voted")]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetMostVotedIdeas()
    {
        try
        {
            var ideas = await _context.Ideas
                .Include(i => i.User)
                .Include(i => i.Group)
                .Include(i => i.Votes)

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

    /// <summary>
    /// Gets the top 5 contributors based on the number of ideas created.
    /// </summary>
    /// <returns>A list of top contributors with their idea counts.</returns>
    /// <response code="200">Returns the top contributors successfully.</response>
    /// <response code="500">Internal server error occurred.</response>
    [HttpGet("top-contributors")]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status500InternalServerError)]
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

    /// <summary>
    /// Gets the top 5 most recently promoted ideas.
    /// </summary>
    /// <returns>A list of promoted ideas with their promotion dates.</returns>
    /// <response code="200">Returns the promoted ideas successfully.</response>
    /// <response code="500">Internal server error occurred.</response>
    [HttpGet("promoted-ideas")]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetPromotedIdeas()
    {
        try
        {
            var ideas = await _context.Ideas

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

    /// <summary>
    /// Gets aggregated statistics for all ideas (Total, Open, Promoted, Closed).
    /// </summary>
    /// <returns>An object containing idea statistics.</returns>
    /// <response code="200">Returns the idea statistics successfully.</response>
    /// <response code="500">Internal server error occurred.</response>
    [HttpGet("idea-statistics")]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetIdeaStatistics()
    {
        try
        {
            var stats = await _context.Ideas
                .Where(i => !i.IsDeleted)
                .GroupBy(x => 1)
                .Select(g => new
                {
                    Total = g.Count(),
                    Open = g.Count(i => i.Status == IdeaStatus.Open),
                    Promoted = g.Count(i => i.IsPromotedToProject),
                    Closed = g.Count(i => i.Status == IdeaStatus.Closed)
                })
                .FirstOrDefaultAsync();

            if (stats == null)
            {
                stats = new { Total = 0, Open = 0, Promoted = 0, Closed = 0 };
            }

            return Ok(ApiResponse.Ok("Idea statistics", stats));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching idea statistics");
            return StatusCode(500, ApiResponse.Fail("Internal server error"));
        }
    }

    /// <summary>
    /// Gets the top 5 groups based on engagement (Idea Count + Vote Count).
    /// </summary>
    /// <returns>A list of groups with their engagement metrics.</returns>
    /// <response code="200">Returns the group engagement data successfully.</response>
    /// <response code="500">Internal server error occurred.</response>
    [HttpGet("group-engagement")]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status500InternalServerError)]
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
                    VoteCount = g.Ideas
                        .Where(i => !i.IsDeleted)
                        .SelectMany(i => i.Votes)
                        .Count(v => !v.IsDeleted)
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

    /// <summary>
    /// Gets personal statistics for the currently authenticated user.
    /// </summary>
    /// <returns>An object containing the user's ideas created, votes cast, and projects involved.</returns>
    /// <response code="200">Returns the personal statistics successfully.</response>
    /// <response code="401">User is not authenticated.</response>
    /// <response code="500">Internal server error occurred.</response>
    [HttpGet("personal-stats")]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status500InternalServerError)]
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
