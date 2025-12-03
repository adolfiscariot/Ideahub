using api.Data;
using api.Models;
using api.Helpers;
using api.Constants;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity.UI.Services;
using api.Services;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;

//Cors allowed origins
var AllowedOrigins = "AllowedOrigins";

//1. Create the builder
var builder = WebApplication.CreateBuilder(args);

//2. Add Services
//2.1 Controllers Service
builder.Services.AddControllers();

//2.2 EF Core Service
var connectionString = builder.Configuration.GetConnectionString("IdeahubString")
    ?? throw new Exception("Connection String Not Found!");

builder.Services.AddDbContext<IdeahubDbContext>(options =>
    options.UseNpgsql(connectionString)
);

//2.3 Identity Service
builder.Services.AddIdentity<IdeahubUser, IdentityRole>(options =>
    {
        //Password Settings
        options.Password.RequireDigit = true;
        options.Password.RequiredLength = 8;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true;
        //User Settings
        options.User.RequireUniqueEmail = true;
        //Sign In Settings
        options.SignIn.RequireConfirmedEmail = true;
    })
    .AddEntityFrameworkStores<IdeahubDbContext>()
    .AddDefaultTokenProviders();

//2.4 Authentication Service
var JwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new Exception("JWT Key Not Found!");

//Convert key from hex string to byte array
var key = JwtHexToBytes.FromHexToBytes(JwtKey);

JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

builder.Services.AddAuthentication(options => 
{
    //Use Jwt as default token for authentication & challenges
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false; //SHOULD BE REMOVED EVENTUALLY
        options.TokenValidationParameters = new TokenValidationParameters
        {
            //Validate token issuer, audience and signature
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],

            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],

            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),

            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,

            //Map the role claim type
            RoleClaimType = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
        };
        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = ctx =>
            {
                Console.WriteLine($"Auth failed: {ctx.Exception}");
                return Task.CompletedTask;
            }
        };
    });

//2.5 Authorization Service
builder.Services.AddAuthorization(options =>
{
    //SuperAdmin only can access stuff
    options.AddPolicy("SuperAdminOnly", policy =>
        policy.RequireRole(RoleConstants.SuperAdmin));

    //GroupAdmin (&SuperAdmin) can access stuff
    options.AddPolicy("GroupAdminOnly", policy =>
        policy.RequireAssertion(context => 
            context.User.IsInRole(RoleConstants.SuperAdmin) ||
            context.User.IsInRole(RoleConstants.GroupAdmin)
        )
    );
});

//2.6 CORS Service
builder.Services.AddCors(options =>
{
    options.AddPolicy(AllowedOrigins, policy =>
        policy.WithOrigins("http://localhost:4200", "http://localhost:8080", "http://localhost:8081")
              .AllowAnyHeader()
              .AllowAnyMethod()
    );
});

//2.7 Customizing ModelState Validation
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
                    .Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

        var response = ApiResponse.Fail("Model State Validation Failed", errors);

        return new BadRequestObjectResult(response);
    };
});

//2.8 Email Sender
builder.Services.AddScoped<api.Helpers.IEmailSender, EmailSender>();

//2.9 Link the SendGridSettings class to the "SendGrid" user secrets
builder.Services.Configure<SendGridSettings>(
    builder.Configuration.GetSection("SendGrid"));

//2.10 IToken Service
builder.Services.AddScoped<ITokenService, TokenService>();


//3. Build the app
var app = builder.Build();

//Apply pending migrations and create database if it doesn't exist
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<IdeahubDbContext>();
    dbContext.Database.EnsureCreated(); // Creates schema without migrations
}

//Seed Roles at App Startup
using (var scope = app.Services.CreateScope())
{
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    var roles = new [] {RoleConstants.SuperAdmin, RoleConstants.GroupAdmin, RoleConstants.RegularUser};

    foreach(var role in roles)
    {
        if(!await roleManager.RoleExistsAsync(role))
        {
            await roleManager.CreateAsync(new IdentityRole(role));
        }
    }

    // Seed SuperAdmin User
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<IdeahubUser>>();
    var adminEmail = "admin@ideahub.com";
    var adminUser = await userManager.FindByEmailAsync(adminEmail);

    if (adminUser == null)
    {
        adminUser = new IdeahubUser
        {
            UserName = "SuperAdmin",
            Email = adminEmail,
            DisplayName = "Super Admin",
            EmailConfirmed = true
        };

        var result = await userManager.CreateAsync(adminUser, "Admin@123");
        if (result.Succeeded)
        {
            await userManager.AddToRoleAsync(adminUser, RoleConstants.SuperAdmin);
        }
    }

    // Seed Initial Groups
    var dbContext = scope.ServiceProvider.GetRequiredService<IdeahubDbContext>();
    if (!dbContext.Groups.Any())
    {
        var groups = new List<Group>
        {
            new Group 
            { 
                Name = "Innovation & Product Development Group", 
                Description = "Focused on ideating, prototyping, and testing new software solutions, AI models, and automation tools. This group ensures that all new concepts are aligned with market needs and Adept’s strategic vision.",
                CreatedByUserId = adminUser.Id,
                CreatedAt = DateTime.UtcNow,
                UserGroups = new List<UserGroup>
                {
                    new UserGroup { UserId = adminUser.Id, IsGroupAdmin = true, JoinedAt = DateTime.UtcNow }
                }
            },
            new Group 
            { 
                Name = "Digital Transformation & Tech Integration Group", 
                Description = "Responsible for implementing cutting-edge technologies across the organization and client projects. They handle cloud solutions, LMS development, AI integrations, and overall IT infrastructure modernization.",
                CreatedByUserId = adminUser.Id,
                CreatedAt = DateTime.UtcNow,
                UserGroups = new List<UserGroup>
                {
                    new UserGroup { UserId = adminUser.Id, IsGroupAdmin = true, JoinedAt = DateTime.UtcNow }
                }
            },
            new Group 
            { 
                Name = "Client Solutions & BPO Excellence Group", 
                Description = "Ensures that client-facing services, such as contact center operations, data annotation, and BPO workflows, are optimized for efficiency and quality. Focused on delivering exceptional customer experience.",
                CreatedByUserId = adminUser.Id,
                CreatedAt = DateTime.UtcNow,
                UserGroups = new List<UserGroup>
                {
                    new UserGroup { UserId = adminUser.Id, IsGroupAdmin = true, JoinedAt = DateTime.UtcNow }
                }
            },
            new Group 
            { 
                Name = "Data & Analytics Intelligence Group", 
                Description = "Manages collection, analysis, and interpretation of data for both internal and client use. This group leverages AI and analytics to provide actionable insights and inform strategic decision-making.",
                CreatedByUserId = adminUser.Id,
                CreatedAt = DateTime.UtcNow,
                UserGroups = new List<UserGroup>
                {
                    new UserGroup { UserId = adminUser.Id, IsGroupAdmin = true, JoinedAt = DateTime.UtcNow }
                }
            },
            new Group 
            { 
                Name = "Sustainability, Impact & Community Group", 
                Description = "Drives initiatives around corporate social responsibility, environmental sustainability, and community engagement. Ensures Adept’s solutions contribute positively to society and align with ethical practices.",
                CreatedByUserId = adminUser.Id,
                CreatedAt = DateTime.UtcNow,
                UserGroups = new List<UserGroup>
                {
                    new UserGroup { UserId = adminUser.Id, IsGroupAdmin = true, JoinedAt = DateTime.UtcNow }
                }
            }
        };

        dbContext.Groups.AddRange(groups);
        await dbContext.SaveChangesAsync();
    }
}


//4. Add MiddleWare
if (app.Environment.IsDevelopment())
{
    app.UseMigrationsEndPoint();
} else
{ 
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}
app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseCors(AllowedOrigins);
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

//5. Run the App
app.Run();

