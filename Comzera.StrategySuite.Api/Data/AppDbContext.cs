using Microsoft.EntityFrameworkCore;
using Comzera.StrategySuite.Api.Models;

namespace Comzera.StrategySuite.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<ForecastItem> ForecastItems => Set<ForecastItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Seed some initial companies from the previous vanilla state if needed, 
        // or let the migration utility handle it.
    }
}
