using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
namespace api.Data;

public class IdeahubDbContextFactory : IDesignTimeDbContextFactory<IdeahubDbContext>
{
    public IdeahubDbContext CreateDbContext(string[] args)
    {
        //manually configure iConfiguation to get connectionString env variable
        var configuration = new ConfigurationBuilder()
                .AddUserSecrets<IdeahubDbContextFactory>()
                .AddEnvironmentVariables()
                .Build();

        var connectionString = configuration["ConnectionStrings:IdeahubString"];
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new Exception("Connection string is empty");
        }
        var optionsBuilder = new DbContextOptionsBuilder<IdeahubDbContext>();
        optionsBuilder.UseNpgsql(connectionString);
        return new IdeahubDbContext(optionsBuilder.Options);
    }
}