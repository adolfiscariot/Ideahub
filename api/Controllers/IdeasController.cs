//using System.Security.Claims;
//using api.Data;
//using api.Helpers;
//using api.Models;
//using Microsoft.AspNetCore.Authorization;
//using Microsoft.AspNetCore.Identity;
//using Microsoft.AspNetCore.Mvc;

//namespace api.Controllers;

//[ApiController]
//[Route("api/[controller]")]
//[Authorize]
//public class IdeasController : ControllerBase
//{
    //private readonly UserManager<IdeahubUser> _userManager;
    //private readonly ILogger<IdeasController> _logger;
    //private readonly IdeahubDbContext _context;
    //public IdeasController(ILogger<IdeasController> logger, IdeahubDbContext context, UserManager<IdeahubUser> userManager)
    //{
        //_logger = logger;
        //_context = context;
        //_userManager = userManager;
    //}

    ////Create Ideas
    //[HttpPost("create-idea")]
    //public async Task<IActionResult> CreateIdea(IdeaDto ideaDto)
    //{
        //try
        //{
            //_logger.LogInformation("Creating new idea...");
            //var idea = new Idea
            //{
                //Title = ideaDto.Title,
                //Description = ideaDto.Description,
                //GroupId = 
            //};

            ////add to database
            //_context.Ideas.Add(idea);
            //await _context.SaveChangesAsync();

            //var userEmail = _userManager.
            //if (string.IsNullOrWhiteSpace(userEmail))
                //_logger.LogInformation("New idea created by {userEmail}", userEmail);

            //return Ok(ApiResponse.Ok($"New Idea Created by {userEmail}"));
        //}
        //catch (Exception e)
        //{
            //_logger.LogError("Failed to create idea {e}", e);
            //return BadRequest(ApiResponse.Fail("Failed to create idea", new List<string>()))
        //};
    //}
    
//}