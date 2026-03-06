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
    ?? throw new Exception("AllowedOrigins required but not found in appsettings.json");

//2.6 CORS Service
builder.Services.AddCors(options =>
{
    options.AddPolicy(AllowedOrigins, policy =>
        policy.WithOrigins("http://44.211.34.131:5065")
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
    options.SenderEmail = Environment.GetEnvironmentVariable("SENDGRID_SENDER_EMAIL") ?? "adept.ideahub@gmail.com" ;
    options.SenderName = Environment.GetEnvironmentVariable("SENDGRID_SENDER_NAME") ?? "Ideahub";
    options.ApiKey = Environment.GetEnvironmentVariable("SENDGRID_API_KEY")!;

});

//2.10 IToken Service
builder.Services.AddScoped<ITokenService, TokenService>();

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
app.MapHub<api.Hubs.NotificationHub>("/hubs/notifications");
app.MapFallbackToFile("index.html");

//5. Run the App
app.Run();


