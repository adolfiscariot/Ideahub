using api.Data;
using api.Models;
using api.Helpers;
using api.Constants;
using api.Services;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.FileProviders;
using Microsoft.AspNetCore.Authentication;

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
        //options.SignIn.RequireConfirmedEmail = true;
    })
    .AddEntityFrameworkStores<IdeahubDbContext>()
    .AddDefaultTokenProviders();

//2.4 Authentication Service
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

// Shared semaphore to prevent concurrent JIT provisioning TO prevent race condition
var provisioningLock = new SemaphoreSlim(1, 1);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.Authority = $"https://{builder.Configuration["Auth0:Domain"]}/";
    options.Audience = builder.Configuration["Auth0:Audience"];

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        // Map the role claim type for compatibility
        RoleClaimType = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
    };

    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var dbContext = context.HttpContext.RequestServices.GetRequiredService<IdeahubDbContext>();
            var userManager = context.HttpContext.RequestServices.GetRequiredService<UserManager<IdeahubUser>>();
            var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();

            var email = context.Principal?.FindFirstValue("https://ideahub.api/email")
                        ?? context.Principal?.FindFirstValue(ClaimTypes.Email)
                        ?? context.Principal?.FindFirstValue("email");

            if (string.IsNullOrEmpty(email)) return;

            // 1. Quick check without lock
            var userExists = await dbContext.Users.AnyAsync(u =>
                (u.Email != null && u.Email.ToLower() == email.ToLower()) ||
                (u.UserName != null && u.UserName.ToLower() == email.ToLower()));

            if (!userExists)
            {
                await provisioningLock.WaitAsync();
                try
                {
                    // 2. Re-check inside lock
                    var user = await dbContext.Users.FirstOrDefaultAsync(u =>
                        (u.Email != null && u.Email.ToLower() == email.ToLower()) ||
                        (u.UserName != null && u.UserName.ToLower() == email.ToLower()));

                    if (user == null)
                    {
                        logger.LogInformation("JIT Provisioning user: {Email}", email);

                        var displayName = email.Split('@')[0];
                        if (displayName.Length > 64) displayName = displayName[..64];

                        user = new IdeahubUser
                        {
                            UserName = email,
                            Email = email,
                            EmailConfirmed = true,
                            DisplayName = displayName
                        };

                        var result = await userManager.CreateAsync(user);
                        if (result.Succeeded)
                        {
                            await userManager.AddToRoleAsync(user, RoleConstants.RegularUser);
                        }
                    }
                }
                catch (Exception ex)
                {
                    // handle duplicate errors (Postgres 23505)
                    if (ex.Message.Contains("23505"))
                    {
                        logger.LogWarning("JIT Provisioning handled a concurrent request for {Email}", email);
                    }
                    else
                    {
                        logger.LogError(ex, "JIT Provisioning failed for {Email} with an unexpected error", email);
                    }
                }
                finally
                {
                    provisioningLock.Release();
                }
            }
        },
        OnMessageReceived = context =>
        {
            var path = context.HttpContext.Request.Path;
            if (path.StartsWithSegments("/hubs/notifications"))
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken))
                {
                    context.Token = accessToken;
                }
            }
            return Task.CompletedTask;
        },
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

    //CanJoinCommittee Policy
    options.AddPolicy("CanJoinCommittee", policy =>
        policy.RequireAssertion(context =>
            context.User.IsInRole(RoleConstants.SuperAdmin) ||
            context.User.IsInRole(RoleConstants.CommitteeMember)
        )
    );

    //CanCreateProject Policy
    options.AddPolicy("GroupAdminOrCommitteeMember", policy =>
        policy.RequireAssertion(context =>
            context.User.IsInRole(RoleConstants.GroupAdmin) ||
            context.User.IsInRole(RoleConstants.CommitteeMember)
        )
    );
});

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>()
    ?? new string[0];

// Add DOMAIN_URL to allowed origins
var domainUrl = builder.Configuration["DOMAIN_URL"];
if (!string.IsNullOrEmpty(domainUrl))
{
    allowedOrigins = allowedOrigins.Append(domainUrl).ToArray();
}

if (allowedOrigins.Length == 0)
{
    // Fallback for safety
    allowedOrigins = new[] { "https://ideahub.adept-techno.co.ke" };
}

builder.Services.AddCors(options =>
{
    options.AddPolicy(AllowedOrigins, policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()
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
//builder.Services.Configure<SendGridSettings>(
//builder.Configuration.GetSection("SendGridSettings"));

builder.Services.Configure<SendGridSettings>(options =>
{
    options.SenderEmail = Environment.GetEnvironmentVariable("SENDGRID_SENDER_EMAIL") ?? "adept.ideahub@gmail.com";
    options.SenderName = Environment.GetEnvironmentVariable("SENDGRID_SENDER_NAME") ?? "Ideahub";
    options.ApiKey = Environment.GetEnvironmentVariable("SENDGRID_API_KEY")!;

});

//2.10 IToken Service
builder.Services.AddScoped<ITokenService, TokenService>();

// 2.11 Claims Transformation for Auth0 -> Local ID mapping
builder.Services.AddTransient<IClaimsTransformation, UserSyncClaimsTransformation>();

// MediaFile Service
builder.Services.AddScoped<IMediaFileService, LocalMediaFileService>();

// Password Reset Service
builder.Services.AddScoped<IPasswordResetService, PasswordResetService>();

// Notification Service
builder.Services.AddSignalR();
builder.Services.AddScoped<INotificationService, NotificationService>();

// Scoring Services
builder.Services.AddScoped<IScoringService, ScoringService>();

// LLM Scoring Service
builder.Services.Configure<GeminiSettings>(builder.Configuration.GetSection("GeminiSettings"));
builder.Services.AddHttpClient<ILlmService, LlmService>();

// Health Checks
builder.Services.AddHealthChecks();

// convert enum to string
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

//3. Build the app
var app = builder.Build();

// Serve media files under /uploads
var mediaPath = Path.Combine(builder.Environment.ContentRootPath, "Storage", "media");
if (!Directory.Exists(mediaPath))
    Directory.CreateDirectory(mediaPath);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(mediaPath),
    RequestPath = "/uploads"
});

// APPLY EF MIGRATIONS HERE
using var scope = app.Services.CreateScope();
var services = scope.ServiceProvider;

var db = services.GetRequiredService<IdeahubDbContext>();

var retries = 10;
while (retries > 0)
{
    try
    {
        Console.WriteLine("Applying database migrations...");
        db.Database.Migrate();
        Console.WriteLine("Database migrations applied successfully.");
        break;
    }
    catch (Exception ex) when (
        ex is Npgsql.NpgsqlException ||
        ex is TimeoutException
    )
    {
        retries--;
        Console.WriteLine($"Migration failed. Retries left: {retries}");
        Console.WriteLine(ex.Message);

        if (retries == 0)
            throw;

        await Task.Delay(5000);
    }
}

// Seed roles after migrations
var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
var roles = new[]
{
    RoleConstants.SuperAdmin,
    RoleConstants.GroupAdmin,
    RoleConstants.RegularUser,
    RoleConstants.CommitteeMember
};

foreach (var role in roles)
{
    if (!await roleManager.RoleExistsAsync(role))
    {
        await roleManager.CreateAsync(new IdentityRole(role));
    }
}

var userManager = scope.ServiceProvider.GetRequiredService<UserManager<IdeahubUser>>();
var superAdminEmail = builder.Configuration["SuperAdmin:Email"]
    ?? throw new Exception("SuperAdmin email not configured!");

var superAdminUser = await userManager.FindByEmailAsync(superAdminEmail);
if (superAdminUser != null && !await userManager.IsInRoleAsync(superAdminUser, RoleConstants.SuperAdmin))
{
    await userManager.AddToRoleAsync(superAdminUser, RoleConstants.SuperAdmin);
    Console.WriteLine($"SuperAdmin role assigned to {superAdminEmail}");
}

//4. Add MiddleWare
if (app.Environment.IsDevelopment())
{
    app.UseMigrationsEndPoint();
}
else
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}
//app.UseHttpsRedirection();
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseStaticFiles();
app.UseRouting();
app.UseCors(AllowedOrigins);
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<api.Hubs.NotificationHub>("/api/hubs/notifications");
app.MapHealthChecks("/health");
app.MapFallbackToFile("index.html");

// Dynamic configuration endpoint for the frontend
app.MapGet("/api/config", (IConfiguration config) =>
{
    var apiUrl = config["API_URL"] ?? "http://localhost:5065/api";
    return Results.Ok(new { apiUrl });
});

//5. Run the App
app.Run();

public class UserSyncClaimsTransformation : IClaimsTransformation
{
    private readonly IServiceProvider _serviceProvider;

    public UserSyncClaimsTransformation(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        // Don't transform if already transformed or not authenticated
        if (principal.HasClaim(c => c.Type == "local_id_applied") || !principal.Identity?.IsAuthenticated == true)
        {
            return principal;
        }

        using var scope = _serviceProvider.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<IdeahubUser>>();

        var email = principal.FindFirstValue("https://ideahub.api/email")
                    ?? principal.FindFirstValue(ClaimTypes.Email)
                    ?? principal.FindFirstValue("email");
        if (string.IsNullOrEmpty(email)) return principal;

        var user = await userManager.FindByEmailAsync(email);
        if (user != null)
        {
            var identity = (ClaimsIdentity)principal.Identity!;

            // Remove the Auth0 'sub' claim from NameIdentifier so the local GUID takes over
            var subClaim = identity.FindFirst(ClaimTypes.NameIdentifier);
            if (subClaim != null) identity.RemoveClaim(subClaim);

            // Add the local database ID as the NameIdentifier
            identity.AddClaim(new Claim(ClaimTypes.NameIdentifier, user.Id));

            // Add roles
            var roles = await userManager.GetRolesAsync(user);
            foreach (var role in roles)
            {
                if (!principal.IsInRole(role))
                {
                    identity.AddClaim(new Claim(ClaimTypes.Role, role));
                }
            }

            identity.AddClaim(new Claim("local_id_applied", "true"));
        }

        return principal;
    }
}


