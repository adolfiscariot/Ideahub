using System.Security.Claims;
using api.Data;
using api.Helpers;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/idea")]
[Authorize]
public class IdeaController : ControllerBase
{
    private readonly UserManager<IdeahubUser> _userManager;
    private readonly ILogger<IdeaController> _logger;
    private readonly IdeahubDbContext _context;
    private readonly IEmailSender _emailSender;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IScoringService _scoringService;

    public IdeaController(ILogger<IdeaController> logger, IdeahubDbContext context, UserManager<IdeahubUser> userManager, IEmailSender emailSender, IServiceScopeFactory scopeFactory, IScoringService scoringService)
    {
        _logger = logger;
        _context = context;
        _userManager = userManager;
        _emailSender = emailSender;
        _scopeFactory = scopeFactory;
        _scoringService = scoringService;
    }

    //Create Ideas
    [HttpPost("create-idea")]
    public async Task<IActionResult> CreateIdea(IdeaDto ideaDto, int groupId)
    {
        try
        {
            _logger.LogInformation("Creating new idea...");

            //Fetch user info
            var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                _logger.LogError("User id is null. Can't create a new idea");
                return Unauthorized(ApiResponse.Fail("User Id is null"));
            }

            //check if user is a group member
            var group = await _context.Groups.FindAsync(groupId);
            if (group is null)
            {
                _logger.LogError("Group not found");
                return NotFound(ApiResponse.Fail("Group not found"));
            }

            var isAMember = await _context.UserGroups.AnyAsync(ug => ug.GroupId == groupId && ug.UserId == userId);
            if (!isAMember)
            {
                _logger.LogError("User {userEmail} is not in group {groupName}", userEmail, group.Name);
                return Unauthorized(ApiResponse.Fail("User not in group"));
            }

            //Create new idea
            var idea = new Idea
            {
                Title = ideaDto.Title,
                StrategicAlignment = ideaDto.StrategicAlignment,
                ProblemStatement = ideaDto.ProblemStatement,
                ProposedSolution = ideaDto.ProposedSolution,
                UseCase = ideaDto.UseCase,
                InnovationCategory = ideaDto.InnovationCategory,
                SubCategory = ideaDto.SubCategory,
                TechnologyInvolved = ideaDto.TechnologyInvolved,
                Notes = ideaDto.Notes,
                UserId = userId,
                GroupId = groupId
            };

            //add to database
            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();
            _logger.LogInformation("New idea created by {userEmail}", userEmail);

            // Trigger Phase 1: Automated AI Evaluation
            _logger.LogInformation("AI Scoring beginning...");
            try
            {
                await _scoringService.EvaluateAndStageIdeaAsync(idea);
                _logger.LogInformation("AI Evaluation Successful!");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during automated AI evaluation for idea {IdeaId}", idea.Id);
            }

            // Trigger Email Notifications
            _ = NotifyUsersOfNewIdeaAsync(idea); 

            return Ok(ApiResponse.Ok($"New Idea Created by {userEmail}",
            new {
                    id = idea.Id
                }
            ));
        }
        catch (Exception e)
        {
            _logger.LogError("Failed to create idea {e}", e);
            return BadRequest(ApiResponse.Fail("Failed to create idea"));
        }
    }

    private async Task NotifyUsersOfNewIdeaAsync(Idea idea)
    {
        // Start a new scope because this runs in the background
        using var scope = _scopeFactory.CreateScope();
        var scopedContext = scope.ServiceProvider.GetRequiredService<IdeahubDbContext>();
        var scopedUserManager = scope.ServiceProvider.GetRequiredService<UserManager<IdeahubUser>>();
        var scopedEmailSender = scope.ServiceProvider.GetRequiredService<IEmailSender>();

        try
        {
            var group = await scopedContext.Groups.FindAsync(idea.GroupId);
            var groupName = group?.Name ?? "Your Group";

            // 1. Get Group Members (excluding author)
            var groupMembers = await scopedContext.UserGroups
                .Where(ug => ug.GroupId == idea.GroupId && ug.UserId != idea.UserId)
                .Select(ug => new { Email = ug.User!.Email, Name = ug.User.DisplayName ?? ug.User.UserName })
                .Where(u => !string.IsNullOrEmpty(u.Email))
                .ToListAsync();

            // 2. Get Committee Members (excluding author)
            var committeeUsers = await scopedUserManager.GetUsersInRoleAsync(Constants.RoleConstants.CommitteeMember);
            var committeeMembers = committeeUsers
                .Where(u => u.Id != idea.UserId)
                .Select(u => new { Email = u.Email!, Name = u.DisplayName ?? u.UserName })
                .Where(u => !string.IsNullOrEmpty(u.Email))
                .ToList();

            // Combine and distinct by email
            var recipients = groupMembers.Concat(committeeMembers)
                .GroupBy(u => u.Email)
                .Select(g => g.First())
                .ToList();

            _logger.LogInformation("Notification Debug: IdeaId={IdeaId}, GroupMembers={GMCount}, CommitteeMembers={CMCount}, TotalUniqueRecipients={Total}", 
                idea.Id, groupMembers.Count, committeeMembers.Count, recipients.Count);

            if (!recipients.Any()) 
            {
                _logger.LogWarning("No recipients found for idea {IdeaId} notification.", idea.Id);
                return;
            }

            _logger.LogInformation("Sending notifications to: {Recipients}", string.Join(", ", recipients.Select(r => r.Email)));

            var subject = $"💡 New Idea Posted in Group: {groupName}: {idea.Title}";
            var sentEmails = new HashSet<string>();

            // 1. Notify Group Members
            _logger.LogInformation("Processing notifications for {count} Group Members...", groupMembers.Count);
            var groupTasks = groupMembers.Select(async recipient =>
            {
                try
                {
                    await SendPersonalizedEmailAsync(scopedEmailSender, recipient.Email!, recipient.Name!, subject, groupName, idea);
                    _logger.LogInformation("Notification sent to Group Member: {email}", recipient.Email);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send notification to Group Member: {email}", recipient.Email);
                }
            }).ToList();

            await Task.WhenAll(groupTasks);
            var committeeToNotify = committeeMembers.Where(cm => !sentEmails.Contains(cm.Email!)).ToList();
            _logger.LogInformation("Processing notifications for {count} Committee Members...", committeeToNotify.Count);
            var committeeTasks = committeeToNotify.Select(async recipient =>
            {
                try
                {
                    await SendPersonalizedEmailAsync(scopedEmailSender, recipient.Email!, recipient.Name!, subject, groupName, idea);
                    _logger.LogInformation("Notification sent to Committee Member: {email}", recipient.Email);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send notification to Committee Member: {email}", recipient.Email);
                }
            }).ToList();

            await Task.WhenAll(committeeTasks);
            
            _logger.LogInformation("Finished sending notifications for idea {ideaId}. Total sent: {count}", idea.Id, groupMembers.Count + committeeToNotify.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send notification emails for idea {ideaId}", idea.Id);
        }
    }

    private async Task SendPersonalizedEmailAsync(IEmailSender emailSender, string toEmail, string recipientName, string subject, string groupName, Idea idea)
    {
        var emailBody = $@"
        <div style=""font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px; color: #1e293b;"">
          <div style=""max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;"">
            <!-- Brand Header -->
            <div style=""background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;"">
              <h1 style=""color: #ffffff; margin: 0; font-size: 24px;"">Ideahub</h1>
              <p style=""color: rgba(255,255,255,0.9); margin-top: 5px; font-size: 14px;"">Innovation & Collaboration</p>
            </div>

            <!-- Content Area -->
            <div style=""padding: 30px;"">
              <h2 style=""color: #1e293b; margin-top: 0; font-size: 20px;"">Hello!</h2>
              <p style=""font-size: 16px; line-height: 1.6; color: #64748b;"">A new idea has just been shared in Group: <strong>{groupName}</strong>.</p>
              
              <div style=""background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 25px 0;"">
                <h3 style=""margin-top: 0; color: #4f46e5; font-size: 18px;"">{idea.Title}</h3>
                <p style=""font-size: 14px; margin-bottom: 10px;""><strong>Problem:</strong> {(idea.ProblemStatement?.Length > 150 ? idea.ProblemStatement.Substring(0, 150) + "..." : idea.ProblemStatement ?? "N/A")}</p>
                <p style=""font-size: 14px; margin: 0;""><strong>Solution:</strong> {(idea.ProposedSolution?.Length > 150 ? idea.ProposedSolution.Substring(0, 150) + "..." : idea.ProposedSolution ?? "N/A")}</p>
              </div>

              <div style=""text-align: center; margin-top: 30px;"">
                <p style=""font-size: 14px; color: #64748b; margin-bottom: 20px;"">Log in to Ideahub portal to view the full details and share your thoughts.</p>
              </div>
            </div>

            <!-- Footer -->
            <div style=""background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;"">
              <p style=""font-size: 12px; color: #94a3b8; margin: 0 0 5px 0;"">You are receiving this because you are a member of Group: {groupName} or a Committee Member.</p>
            </div>
          </div>
        </div>";

        await emailSender.SendEmailAsync(toEmail, subject, emailBody);
    }

    //View all ideas
    [HttpGet("view-ideas")]
    public async Task<IActionResult> ViewIdeas(int groupId, string? type, string? domain, string? impact)
    {
        //Fetch user
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            _logger.LogError("User Id not found");
            return Unauthorized(ApiResponse.Fail("User Id not found"));
        }

        //Fetch group
        var group = await _context.Groups.FindAsync(groupId);
        if (group is null)
        {
            _logger.LogError("Group not found");
            return NotFound(ApiResponse.Fail("Group not found"));
        }

        //Ensure user is in group
        var isAMember = await _context.UserGroups.AnyAsync(ug => ug.GroupId == groupId && ug.UserId == userId);
        if (!isAMember)
        {
            _logger.LogError("User {userEmail} isn't in the group {groupName}", userEmail, group.Name);
            return NotFound(ApiResponse.Fail("User not in group"));
        }

        //Fetch ideas and votes
        var ideas = await _context.Ideas
            .Where(i => i.GroupId == groupId)
            .Include(i => i.Votes)
            .ToListAsync();

        if (ideas.Count == 0)
        {
            _logger.LogInformation("No ideas found in group: {groupName}", group.Name);
            return Ok(ApiResponse.Ok("No ideas found", new List<object>()));
        }

        var ideaDataToReturn = new List<object>();
        foreach (var idea in ideas)
        {
            ideaDataToReturn.Add(new {
                idea.Id,
                idea.Title,
                idea.StrategicAlignment,
                idea.ProblemStatement,
                idea.ProposedSolution,
                idea.UseCase,
                idea.InnovationCategory,
                idea.SubCategory,
                idea.TechnologyInvolved,
                idea.Notes,
                idea.Score,
                idea.UserId,
                idea.Group.Name,
                idea.CreatedAt,
                idea.IsPromotedToProject,
                idea.IsDeleted,
                voteCount = idea.Votes.Count,
                userVoted = idea.Votes.Any(v => v.UserId == userId),
                Status = idea.Status.ToString()
            });
        }

        
        return Ok(ApiResponse.Ok($"{ideas.Count()} Ideas found", ideaDataToReturn));
    }

    //View an idea
    [HttpGet("open-idea")]
    public async Task<IActionResult> OpenIdea(int groupId, int ideaId)
    {
        //Fetch user
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            _logger.LogError("User Id not found");
            return Unauthorized(ApiResponse.Fail("User Id not found"));
        }

        //Fetch group
        var group = await _context.Groups.FindAsync(groupId);
        if (group is null)
        {
            _logger.LogError("Group not found");
            return NotFound(ApiResponse.Fail("Group not found"));
        }

        //Ensure user is in group
        var isAMember = await _context.UserGroups.AnyAsync(ug => ug.GroupId == groupId && ug.UserId == userId);
        if (!isAMember)
        {
            _logger.LogError("User {userEmail} isn't in the group {groupName}", userEmail, group.Name);
            return NotFound(ApiResponse.Fail("User not in group"));
        }

        //Fetch idea
        var idea = await _context.Ideas
            .Include(i => i.User)
            .Include(i => i.Group)
            .FirstOrDefaultAsync(i => i.Id == ideaId && i.GroupId == groupId);
        if (idea is null)
        {
            _logger.LogError("Idea with Id {ideaId} not found in group {groupName}", ideaId, group.Name);
            return NotFound(ApiResponse.Fail("Idea not found"));
        }

        //Create a list of idea data to return
        var ideaDataToReturn = new IdeaDetailsDto
        {
            Title = idea.Title,
            StrategicAlignment = idea.StrategicAlignment,
            ProblemStatement = idea.ProblemStatement,
            ProposedSolution = idea.ProposedSolution,
            UseCase = idea.UseCase,
            InnovationCategory = idea.InnovationCategory,
            SubCategory = idea.SubCategory,
            TechnologyInvolved = idea.TechnologyInvolved,
            Notes = idea.Notes,
            Score = idea.Score,
            AiReasoning = idea.AiReasoning,
            CurrentStage = idea.CurrentStage,
            Author = idea.User.DisplayName,
            Group = idea.Group.Name,
            Status = idea.Status.ToString(),
            IsPromotedToProject = idea.IsPromotedToProject
        };

        _logger.LogInformation("Idea found: {ideaDataToReturn}", ideaDataToReturn);
        return Ok(ApiResponse.Ok("Idea found", ideaDataToReturn));
    }

    //Update an idea
    [HttpPut("{ideaId}")]
    public async Task<IActionResult> UpdateIdea(int ideaId, IdeaUpdateDto ideaUpdateDto)
    {
        //Fetch user info
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            _logger.LogError("User id is null. Can't create a new idea");
            return Unauthorized(ApiResponse.Fail("User Id is null"));
        }

        //fetch idea if user is the idea author
        var idea = await _context.Ideas
            .Include(i => i.User)
            .Include(i => i.Group)
            .Where(i => i.UserId == userId)
            .FirstOrDefaultAsync(i => i.Id == ideaId);
        if (idea is null)
        {
            _logger.LogError("Idea not found");
            return NotFound(ApiResponse.Fail("Idea not found"));
        }

        //apply changes to the idea
        if (ideaUpdateDto.Score != null)
        {
            _scoringService.SetStageByScore(idea, ideaUpdateDto.Score.Value);
        }
        if (ideaUpdateDto.Title != null)
        {
            idea.Title = ideaUpdateDto.Title;
        }
        if (ideaUpdateDto.StrategicAlignment != null)
        {
            idea.StrategicAlignment = ideaUpdateDto.StrategicAlignment;
        }
        if (ideaUpdateDto.ProblemStatement != null)
        {
            idea.ProblemStatement = ideaUpdateDto.ProblemStatement;
        }
        if (ideaUpdateDto.ProposedSolution != null)
        {
            idea.ProposedSolution = ideaUpdateDto.ProposedSolution;
        }
        if (ideaUpdateDto.UseCase != null)
        {
            idea.UseCase = ideaUpdateDto.UseCase;
        }
        if (ideaUpdateDto.InnovationCategory != null)
        {
            idea.InnovationCategory = ideaUpdateDto.InnovationCategory;
        }
        if (ideaUpdateDto.SubCategory != null)
        {
            idea.SubCategory = ideaUpdateDto.SubCategory;
        }
        if (ideaUpdateDto.TechnologyInvolved != null)
        {
            idea.TechnologyInvolved = ideaUpdateDto.TechnologyInvolved;
        }
        if (ideaUpdateDto.Notes != null)
        {
            idea.Notes = ideaUpdateDto.Notes;
        }
        //Parse the status string and convert it to type IdeaStatus enum
        if (!string.IsNullOrWhiteSpace(ideaUpdateDto.Status))
        {
            if (Enum.TryParse(ideaUpdateDto.Status, true, out IdeaStatus newStatus))
            {
                idea.Status = newStatus;
            }
            else
            {
                _logger.LogError("Invalid status string {statusString} provided for idea {ideaId}", ideaUpdateDto.Status, ideaId);
                return BadRequest(ApiResponse.Fail("Parsing failed. Invalid status string provided"));
            }
        }

        var updatedIdea = new IdeaDetailsDto
        {
            Title = idea.Title,
            StrategicAlignment = idea.StrategicAlignment,
            ProblemStatement = idea.ProblemStatement,
            ProposedSolution = idea.ProposedSolution,
            UseCase = idea.UseCase,
            InnovationCategory = idea.InnovationCategory,
            SubCategory = idea.SubCategory,
            TechnologyInvolved = idea.TechnologyInvolved,
            Notes = idea.Notes,
            AiReasoning = idea.AiReasoning,
            CurrentStage = idea.CurrentStage,
            Score = idea.Score,
            Author = idea.User.DisplayName,
            Group = idea.Group.Name,
            Status = idea.Status.ToString(),
            IsPromotedToProject = idea.IsPromotedToProject
        };

        //save it all
        idea.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Idea {ideaId} updated by {userEmail}", ideaId, userEmail);
        return Ok(ApiResponse.Ok("Idea updated", updatedIdea));
    }

    //Promote an idea to a project
    [Authorize(Policy = "GroupAdminOnly")]
    [HttpPost("promote-idea")]
    [Obsolete("Promotion is now handled atomically during Project creation (/api/Project/create-project).")]
    public async Task<IActionResult> PromoteIdea(int groupId, int ideaId)
    {
        //Fetch user info
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userId))
        {
            _logger.LogError("User not authenticated");
            return Unauthorized(ApiResponse.Fail("User not authenticated"));
        }

        //group info
        var group = await _context.Groups.FindAsync(groupId);
        if (group is null)
        {
            _logger.LogError("Group not found");
            return NotFound(ApiResponse.Fail("Group not found"));
        }

        //Promote idea
        var idea = await _context.Ideas.FindAsync(ideaId);
        if (idea is null)
        {
            _logger.LogError("No idea with ID {ideaId} was found", ideaId);
            return NotFound(ApiResponse.Fail("Idea not found"));
        }
        idea.IsPromotedToProject = true;
        idea.Status = IdeaStatus.Closed;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Idea {ideaId} promoted to project", ideaId);
        return Ok(ApiResponse.Ok("Idea promoted to project successfully"));
    }

    [Authorize(Policy = "GroupAdminOnly")]
    [HttpPatch("close-idea")]
    public async Task<IActionResult> CloseIdea([FromQuery] int ideaId)
    {

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(userId))
            {
                _logger.LogError("User not authenticated");
                return Unauthorized(ApiResponse.Fail("User not authenticated"));
            }
        var idea = await _context.Ideas.FindAsync(ideaId);
        if (idea == null)
            return NotFound(ApiResponse.Fail("Idea not found"));

        if (idea.Status == IdeaStatus.Closed)
            return BadRequest(ApiResponse.Fail("Idea already closed"));

        idea.Status = IdeaStatus.Closed;
        await _context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Idea closed successfully"));
    }


    //Delete an idea
    [HttpDelete("{ideaId}")]
    public async Task<IActionResult> DeleteIdea(int ideaId)
    {
        try
        {
            //Fetch user info
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";

            if (string.IsNullOrWhiteSpace(userId))
            {
                _logger.LogError("User not authenticated");
                return Unauthorized(ApiResponse.Fail("User not authenticated"));
            }

            //fetch idea if user is the idea author
            var idea = await _context.Ideas.Where(i => i.UserId == userId).FirstOrDefaultAsync(i => i.Id == ideaId);
            if (idea is null)
            {
                _logger.LogError("Idea not found");
                return NotFound(ApiResponse.Fail("Idea not found"));
            }

            //Let user delete group if they're admin
            _context.Ideas.Remove(idea);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Idea '{ideaProblemStatement}' has been deleted by '{userEmail}' ", idea.ProblemStatement, userEmail);
            return Ok(ApiResponse.Ok("Idea deleted successfully"));
        }
        catch (Exception e)
        {
            _logger.LogInformation("Failed to delete idea {ideaId}: {e}", ideaId, e);
            return StatusCode(500, ApiResponse.Fail("Failed to delete idea"));
        }
    }
}