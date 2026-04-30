using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ideahub.Migrations
{
    /// <inheritdoc />
    public partial class AddFilterJsonb : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            //migrationBuilder.AddColumn<string>(
                //name: "Filter",
                //table: "Ideas",
                //type: "jsonb",
                //nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            //migrationBuilder.DropColumn(
                //name: "Filter",
                //table: "Ideas");
        }

    }
}
