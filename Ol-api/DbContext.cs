using Microsoft.EntityFrameworkCore;

public class DatabaseContext: DbContext
{
    public DbSet<PositionData> PositionData { get; set; }
    public DatabaseContext(DbContextOptions<DatabaseContext> options) : base(options) { }
}