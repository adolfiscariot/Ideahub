using System.Security.Claims;
using api.Data;
using api.Helpers;
using api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TimesheetController : ControllerBase
{
    private readonly IdeahubDbContext _context;
    private readonly ILogger<TimesheetController> _logger;

    public TimesheetController(IdeahubDbContext context, ILogger<TimesheetController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // POST: api/timesheet/log-work?taskId={taskId}
    [HttpPost("log-work")]
    public async Task<IActionResult> LogWork([FromQuery] int taskId, [FromBody] TimesheetDto createDto)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse.Fail("User ID not found in token"));
            }

            // Verify task exists
            var taskExists = await _context.ProjectTasks.AnyAsync(t => t.Id == taskId && !t.IsDeleted);
            if (!taskExists)
            {
                return NotFound(ApiResponse.Fail("Task not found"));
            }

            var timesheet = new Timesheet
            {
                TaskId = taskId,
                UserId = userId,
                WorkDate = createDto.WorkDate.ToUniversalTime(),
                Description = createDto.Description,
                HoursSpent = createDto.HoursSpent,
                Comments = createDto.Comments,
                HasBlocker = createDto.HasBlocker,
                BlockerDescription = createDto.BlockerDescription,
                BlockerSeverity = createDto.BlockerSeverity,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Timesheets.Add(timesheet);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Work log created for task {TaskId} by user {UserId}", taskId, userId);

            return Ok(ApiResponse.Ok("Work log created successfully", new { id = timesheet.Id }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to log work for task {TaskId}", taskId);
            return StatusCode(500, ApiResponse.Fail("An error occurred while creating the work log"));
        }
    }

    // GET: api/timesheet/view-logs?taskId={taskId}
    [HttpGet("view-logs")]
    public async Task<IActionResult> GetTaskLogs([FromQuery] int taskId)
    {
        try
        {
            var logs = await _context.Timesheets
                .Include(ts => ts.User)
                .Where(ts => ts.TaskId == taskId && !ts.IsDeleted)
                .OrderByDescending(ts => ts.WorkDate)
                .Select(ts => new TimesheetDetailsDto
                {
                    Id = ts.Id,
                    TaskId = ts.TaskId,
                    UserId = ts.UserId,
                    UserName = ts.User.DisplayName,
                    WorkDate = ts.WorkDate,
                    Description = ts.Description,
                    HoursSpent = ts.HoursSpent,
                    Comments = ts.Comments,
                    HasBlocker = ts.HasBlocker,
                    BlockerDescription = ts.BlockerDescription,
                    BlockerSeverity = ts.BlockerSeverity,
                    CreatedAt = ts.CreatedAt
                })
                .ToListAsync();

            return Ok(ApiResponse.Ok($"{logs.Count} logs found", logs));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch logs for task {TaskId}", taskId);
            return StatusCode(500, ApiResponse.Fail("An error occurred while fetching work logs"));
        }
    }

    // PUT: api/timesheet/update-log/{id}
    [HttpPut("update-log/{id}")]
    public async Task<IActionResult> UpdateLog(int id, [FromBody] TimesheetUpdateDto updateDto)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var entry = await _context.Timesheets.FindAsync(id);

            if (entry == null || entry.IsDeleted)
            {
                return NotFound(ApiResponse.Fail("Work log not found"));
            }

            if (entry.UserId != userId)
            {
                return Forbid();
            }

            if (updateDto.WorkDate.HasValue) entry.WorkDate = updateDto.WorkDate.Value.ToUniversalTime();
            if (updateDto.Description != null) entry.Description = updateDto.Description;
            if (updateDto.HoursSpent.HasValue) entry.HoursSpent = updateDto.HoursSpent.Value;
            if (updateDto.Comments != null) entry.Comments = updateDto.Comments;
            if (updateDto.HasBlocker.HasValue) entry.HasBlocker = updateDto.HasBlocker.Value;
            if (updateDto.BlockerDescription != null) entry.BlockerDescription = updateDto.BlockerDescription;
            if (updateDto.BlockerSeverity.HasValue) entry.BlockerSeverity = updateDto.BlockerSeverity;

            entry.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.Ok("Work log updated successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update work log {Id}", id);
            return StatusCode(500, ApiResponse.Fail("An error occurred while updating the work log"));
        }
    }

    // DELETE: api/timesheet/delete-log/{id}
    [HttpDelete("delete-log/{id}")]
    public async Task<IActionResult> DeleteLog(int id)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var entry = await _context.Timesheets.FindAsync(id);

            if (entry == null || entry.IsDeleted)
            {
                return NotFound(ApiResponse.Fail("Work log not found"));
            }

            if (entry.UserId != userId)
            {
                return Forbid();
            }

            entry.IsDeleted = true;
            entry.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.Ok("Work log deleted successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete work log {Id}", id);
            return StatusCode(500, ApiResponse.Fail("An error occurred while deleting the work log"));
        }
    }

    // GET: api/timesheet/my-logs
    [HttpGet("my-logs")]
    public async Task<IActionResult> GetMyLogs()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse.Fail("User ID not found"));
            }

            var logs = await _context.Timesheets
                .Include(ts => ts.Task)
                .Where(ts => ts.UserId == userId && !ts.IsDeleted)
                .OrderByDescending(ts => ts.WorkDate)
                .Select(ts => new TimesheetDto
                {
                    Id = ts.Id,
                    TaskId = ts.TaskId,
                    TaskTitle = ts.Task.Title,
                    WorkDate = ts.WorkDate,
                    Description = ts.Description,
                    HoursSpent = ts.HoursSpent,
                    HasBlocker = ts.HasBlocker,
                    CreatedAt = ts.CreatedAt
                })
                .ToListAsync();

            return Ok(ApiResponse.Ok("Personal logs retrieved", logs));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch personal logs");
            return StatusCode(500, ApiResponse.Fail("An error occurred"));
        }
    }
}
