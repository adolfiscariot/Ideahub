using api.Data;
using api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using api.Helpers;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/{controller}")]
[Authorize]
public class VoteController : ControllerBase
{
    private readonly ILogger<VoteController> _logger;
    private readonly IdeahubDbContext _context;

    public VoteController(ILogger<VoteController> logger, IdeahubDbContext context)
    {
        _logger = logger;
        _context = context;
    }

    //Cast Vote
    [HttpPost("cast-vote")]
    public async Task<IActionResult> CastVote(int groupId, int ideaId)
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
        try
        {
            //fetch user info
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                _logger.LogError("Cast Vote: Vote Controller: User Id not found");
                return Unauthorized(ApiResponse.Fail("User Id not found"));
            }

            //fetch group info
            var group = await _context.Groups.FirstOrDefaultAsync(g => g.Id == groupId);
            if (group is null)
            {
                _logger.LogError("Cast Vote: Group with id {groupId} not found", groupId);
                return NotFound(ApiResponse.Fail("Group not found"));
            }

            //make sure user is in group
            var groupMember = await _context.UserGroups
                .FirstOrDefaultAsync(ug => ug.GroupId == groupId && ug.UserId == userId);

            if (groupMember is null)
            {
                _logger.LogError("Cast Vote: User {userEmail} does not belong to group {groupName}", userEmail, group.Name);
                return StatusCode(403, ApiResponse.Fail("User can't vote as they're not in the idea's group"));
            }

            //fetch the idea
            var idea = await _context.Ideas.FirstOrDefaultAsync(i => i.Id == ideaId);
            if (idea is null)
            {
                _logger.LogError("Cast Vote: Idea with Id {ideaId} doesn't exist", ideaId);
                return NotFound(ApiResponse.Fail("Idea not found"));
            }

            //check if user has already voted
            bool hasVoted = _context.Votes.Any(v => v.UserId == userId && v.IdeaId == ideaId);
            if (hasVoted)
            {
                _logger.LogError("Cast Vote: User {userName} has already voted for idea {ideaId}", userEmail, ideaId);
                return StatusCode(403, ApiResponse.Fail("User has already voted"));
            }

            //cast a vote
            var vote = new Vote
            {
                UserId = userId,
                IdeaId = idea.Id
            };

            //save vote
            _context.Votes.Add(vote);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Cast Vote: Vote cast by {userEmail} for idea {ideaTitle}", userEmail, idea.Title);
            return Ok(ApiResponse.Ok("Vote cast successfully"));
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Cast Vote: Vote casting by {userEmail} for idea {IdeaId} failed", userEmail, ideaId);
            return StatusCode(500, ApiResponse.Fail("Internal server error occured while casting a vote. Please try again"));
        }
    }

    //Unvote
    [HttpPost("unvote")]
    public async Task<IActionResult> Unvote(int voteId)
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
        try
        {
            //fetch user info
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                _logger.LogError("Unvote: Vote Controller: User Id not found");
                return Unauthorized(ApiResponse.Fail("User Id not found"));
            }

            //fetch vote
            var vote = await _context.Votes
                .Include(v => v.User)
                .FirstOrDefaultAsync(v => v.Id == voteId);

            if (vote is null)
            {
                _logger.LogError("Vote with id {voteId} not found", voteId);
                return NotFound(ApiResponse.Fail("Vote not found"));
            }

            //check if user voted for idea
            if (vote.Id != voteId || vote.UserId != userId)
            {
                _logger.LogWarning("Unvote: User{userEmail} hadn't voted for that idea", userEmail);
                return BadRequest(ApiResponse.Fail("User hasn't voted for that idea"));
            }

            //otherwise delete the vote
            vote.IsDeleted = true;
            vote.DeletedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();


            _logger.LogInformation("Vote removed for vote id {voteId} belonging to idea {ideaId} by user {userEmail}", voteId, vote.IdeaId, userEmail);
            return Ok(ApiResponse.Ok("Vote deleted successfully"));
        }
        catch (Exception e)
        {
            _logger.LogInformation(e, "Unvote: Failed to remove vote");
            return StatusCode(500, ApiResponse.Fail("An internal server error occurred while removing your vote. Please try again"));
        }
    }

    //See votes & voters (GroupAdminOnly)
    [Authorize(Policy = "GroupAdminOnly")]
    [HttpGet("see-votes")]
    public async Task<IActionResult> SeeVotes(int ideaId)
    {
        //fetch user info
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
        try
        {
            //fetch user info
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                _logger.LogError("Unvote: Vote Controller: User Id not found");
                return Unauthorized(ApiResponse.Fail("User Id not found"));
            }

            //fetch votes with similar idea id
            var votes = _context.Votes.Include(v => v.User).Where(v => v.IdeaId == ideaId).ToList();
            if (votes.Count == 0)
            {
                _logger.LogWarning("See Votes: Idea {ideaId} has no votes", ideaId);
                return Ok(ApiResponse.Fail("Votes not found for idea"));
            }
            var voteDetails = votes.Select(votes => new
            {
                UserName = votes.User.DisplayName,
                Email = votes.User.Email,
                Time = votes.VotedAt,
            });

            _logger.LogInformation("{voteCount} votes found for idea {ideaId}", votes.Count, ideaId);
            return Ok(ApiResponse.Ok("Votes found"));
        }
        catch (Exception e)
        {
            _logger.LogError(e, "See Votes: Failed to show votes for idea {ideaId}", ideaId);
            return StatusCode(500, ApiResponse.Fail("An internal server error prevented all votes from being fetched. Please try again"));
        }
    } 
    
    //Count votes (GroupAdminOnly)
}