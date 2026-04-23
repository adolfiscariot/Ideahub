using System.Security.Claims;
using api.Controllers;
using api.Data;
using api.Helpers;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Ideahub.Tests
{
    public class ScoringControllerTests : IDisposable
    {
        private readonly IdeahubDbContext _context;
        private readonly Mock<IScoringService> _mockScoringService;
        private readonly Mock<ILogger<ScoringController>> _mockLogger;
        private readonly ScoringController _controller;
        private readonly string _testUserId = "admin-123";
        private readonly string _databaseName = Guid.NewGuid().ToString();

        public ScoringControllerTests()
        {
            var options = new DbContextOptionsBuilder<IdeahubDbContext>()
                .UseInMemoryDatabase(databaseName: _databaseName)
                .Options;
            _context = new IdeahubDbContext(options);

            _mockScoringService = new Mock<IScoringService>();
            _mockLogger = new Mock<ILogger<ScoringController>>();

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, _testUserId),
                new Claim(ClaimTypes.Role, "SuperAdmin")
            }, "TestAuthentication"));

            _controller = new ScoringController(_context, _mockScoringService.Object, _mockLogger.Object)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = user }
                }
            };
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        #region Phase 1: AI Evaluation

        [Fact]
        public async Task EvaluateIdea_ValidStep_ShouldCallService()
        {
            // Arrange
            var idea = new Idea { Id = 1, Title = "Test AI", CurrentStage = ScoringStage.Evaluation };
            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();

            _mockScoringService.Setup(s => s.EvaluateAndStageIdeaAsync(It.IsAny<Idea>()))
                .ReturnsAsync((85.0f, "Excellent idea"));

            // Act
            var result = await _controller.EvaluateIdea(1);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            _mockScoringService.Verify(s => s.EvaluateAndStageIdeaAsync(It.IsAny<Idea>()), Times.Once);
        }

        [Fact]
        public async Task EvaluateIdea_WrongStage_ShouldReturnBadRequest()
        {
            // Arrange
            var idea = new Idea { Id = 2, Title = "Wrong Stage", CurrentStage = ScoringStage.Accepted };
            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.EvaluateIdea(2);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }

        #endregion

        #region Phase 2: Business Case

        [Fact]
        public async Task SubmitBusinessCase_Approved_ShouldPromoteToPhase3()
        {
            // Arrange
            var idea = new Idea { Id = 3, CurrentStage = ScoringStage.BusinessCase, Score = 75.0f };
            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();

            var dto = new BusinessCaseDto
            {
                Verdict = Verdict.Approved,
                ExpectedBenefits = "High",
                RiskLevel = RiskLevel.Low,
                ImpactScope = ImpactScope.OrganizationWide,
                EvaluationStatus = EvaluationStatus.Approved,
                OwnerDepartment = ResponsibleDepartment.IT,
                NextSteps = ActionStep.PrototypeDevelopment,
                DecisionDate = DateOnly.FromDateTime(DateTime.Now),
                PlannedDurationWeeks = 4,
                CurrentStage = BusinessCaseResult.InProgress
            };

            // Act
            var result = await _controller.SubmitBusinessCase(3, dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var updatedIdea = await _context.Ideas.FindAsync(3);
            Assert.Equal(ScoringStage.ScoringDimensions, updatedIdea!.CurrentStage);
        }

        [Fact]
        public async Task SubmitBusinessCase_LowScore_ShouldReturnBadRequest()
        {
            // Arrange
            var idea = new Idea { Id = 4, CurrentStage = ScoringStage.BusinessCase, Score = 50.0f }; // Below 70 threshold
            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();

            var dto = new BusinessCaseDto { Verdict = Verdict.Approved };

            // Act
            var result = await _controller.SubmitBusinessCase(4, dto);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }

        #endregion

        #region Phase 3: Scoring Dimensions

        [Fact]
        public async Task SubmitDimensions_Above70_ShouldAcceptIdea()
        {
            // Arrange
            var idea = new Idea { Id = 5, CurrentStage = ScoringStage.ScoringDimensions, Score = 75.0f };
            var bc = new BusinessCase { IdeaId = 5, Verdict = Verdict.Approved };
            _context.Ideas.Add(idea);
            _context.BusinessCases.Add(bc);
            await _context.SaveChangesAsync();

            var dto = new ScoringDimensionsDto
            {
                StrategicAlignment = StrategicAlignmentScore.Strong,
                CustomerImpact = CustomerImpactScore.High,
                FinancialBenefit = FinancialBenefitScore.High,
                Feasibility = FeasibilityScore.High,
                TimeToValue = TimeToValueScore.UnderThreeMonths,
                Cost = CostScore.Low,
                Effort = EffortScore.Low,
                Risk = RiskScore.Low,
                Scalability = ScalabilityScore.High,
                Differentiation = DifferentiationScore.HighDifferentiation,
                SustainabilityImpact = SustainabilityScore.StrongBenefit,
                ProjectConfidence = ConfidenceScore.High
            };

            // Act
            var result = await _controller.SubmitScoringDimensions(5, dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var updatedIdea = await _context.Ideas.FindAsync(5);
            Assert.Equal(ScoringStage.Accepted, updatedIdea!.CurrentStage);
            Assert.Equal(100.0f, updatedIdea.Score);
        }

        [Fact]
        public async Task SubmitDimensions_Below70_ShouldRejectIdea()
        {
            // Arrange
            var idea = new Idea { Id = 6, CurrentStage = ScoringStage.ScoringDimensions, Score = 75.0f };
            var bc = new BusinessCase { IdeaId = 6, Verdict = Verdict.Approved };
            _context.Ideas.Add(idea);
            _context.BusinessCases.Add(bc);
            await _context.SaveChangesAsync();

            var dto = new ScoringDimensionsDto
            {
                StrategicAlignment = StrategicAlignmentScore.Low,
                CustomerImpact = CustomerImpactScore.Low,
                FinancialBenefit = FinancialBenefitScore.Low,
                Feasibility = FeasibilityScore.VeryDifficult,
                TimeToValue = TimeToValueScore.SixToTwelve,
                Cost = CostScore.High,
                Effort = EffortScore.High,
                Risk = RiskScore.High,
                Scalability = ScalabilityScore.Low,
                Differentiation = DifferentiationScore.LowUniqueness,
                SustainabilityImpact = SustainabilityScore.MinimalBenefit,
                ProjectConfidence = ConfidenceScore.Low
            };

            // Act
            var result = await _controller.SubmitScoringDimensions(6, dto);

            // Assert
            var updatedIdea = await _context.Ideas.FindAsync(6);
            Assert.Equal(ScoringStage.Rejected, updatedIdea!.CurrentStage);
            Assert.True(updatedIdea.Score < 70.0f);
        }

        [Fact]
        public async Task SubmitDimensions_MissingBusinessCase_ShouldReturnBadRequest()
        {
            // Arrange
            var idea = new Idea { Id = 7, CurrentStage = ScoringStage.ScoringDimensions };
            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();
            // No business case added

            var dto = new ScoringDimensionsDto();

            // Act
            var result = await _controller.SubmitScoringDimensions(7, dto);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }

        #endregion

        #region Retrieval Tests

        [Fact]
        public async Task GetBusinessCase_Existing_ShouldReturnOk()
        {
            // Arrange
            var idea = new Idea { Id = 8, Title = "BC Parent" };
            _context.Ideas.Add(idea);
            var bc = new BusinessCase
            {
                IdeaId = 8,
                ExpectedBenefits = "Great stuff",
                DecisionDate = DateOnly.FromDateTime(DateTime.Now)
            };
            _context.BusinessCases.Add(bc);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetBusinessCase(8);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var apiResponse = Assert.IsType<ApiResponse>(okResult.Value);
            Assert.Contains("Business case found", apiResponse.Message);
        }

        [Fact]
        public async Task GetDimensions_Existing_ShouldReturnOk()
        {
            // Arrange
            var idea = new Idea { Id = 9, Title = "SD Parent" };
            _context.Ideas.Add(idea);
            var sd = new ScoringDimensions
            {
                IdeaId = 9,
                Score = 88.5f,
                ReviewerComments = "Looks good"
            };
            _context.ScoringDimensions.Add(sd);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetScoringDimensions(9);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var apiResponse = Assert.IsType<ApiResponse>(okResult.Value);
            Assert.Contains("Scoring dimensions found", apiResponse.Message);
        }

        #endregion
    }
}
