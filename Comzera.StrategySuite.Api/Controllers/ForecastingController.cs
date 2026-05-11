using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Comzera.StrategySuite.Api.Data;
using Comzera.StrategySuite.Api.Models;

namespace Comzera.StrategySuite.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ForecastingController : ControllerBase
{
    private readonly AppDbContext _context;

    public ForecastingController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetForecast(int year, int month, int? companyId = null)
    {
        // 1. Get manually added forecast items for this period
        var query = _context.ForecastItems.AsQueryable();
        query = query.Where(f => f.Year == year && f.Month == month);
        if (companyId.HasValue) query = query.Where(f => f.CompanyId == companyId);
        
        var manualItems = await query.ToListAsync();

        // 2. Identify "Fixed" (Recurring) expenses from previous months that should carry over
        // We'll look for any expense marked as IsFixed
        var recurringExpenses = await _context.Expenses
            .Where(e => e.IsFixed)
            .Where(e => !companyId.HasValue || e.CompanyId == companyId)
            .Select(e => new { e.Description, e.Amount, e.CompanyId })
            .Distinct()
            .ToListAsync();

        // 3. Merge them into a single forecast view
        var forecast = manualItems.Select(m => new {
            m.Id,
            m.Description,
            m.Amount,
            m.CompanyId,
            IsFixed = true,
            Source = "Manual"
        }).ToList();

        foreach (var re in recurringExpenses)
        {
            // Don't duplicate if already in manual items
            if (!forecast.Any(f => f.Description == re.Description && f.CompanyId == re.CompanyId))
            {
                forecast.Add(new {
                    Id = 0,
                    Description = re.Description,
                    Amount = re.Amount,
                    re.CompanyId,
                    IsFixed = true,
                    Source = "Recurring"
                });
            }
        }

        return Ok(forecast);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateForecast(int id, [FromBody] ForecastUpdateDto update)
    {
        var item = await _context.ForecastItems.FindAsync(id);
        if (item == null) return NotFound();

        item.Amount = update.Amount;
        
        if (update.ApplyToFuture)
        {
            // Propagate to all future entries with same description/company
            var futureItems = await _context.ForecastItems
                .Where(f => f.Description == item.Description && f.CompanyId == item.CompanyId)
                .Where(f => f.Year > item.Year || (f.Year == item.Year && f.Month > item.Month))
                .ToListAsync();
            
            foreach (var f in futureItems) f.Amount = update.Amount;

            // Also handle recurring expenses (update the "template" amount)
            var fixedExpenses = await _context.Expenses
                .Where(e => e.Description == item.Description && e.CompanyId == item.CompanyId && e.IsFixed)
                .ToListAsync();
            foreach (var e in fixedExpenses) e.Amount = update.Amount;
        }

        await _context.SaveChangesAsync();
        return Ok(item);
    }

    public class ForecastUpdateDto
    {
        public decimal Amount { get; set; }
        public bool ApplyToFuture { get; set; }
    }

    [HttpPost]
    public async Task<IActionResult> AddForecastItem(ForecastItem item)
    {
        _context.ForecastItems.Add(item);
        await _context.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteForecastItem(int id)
    {
        var item = await _context.ForecastItems.FindAsync(id);
        if (item == null) return NotFound();
        _context.ForecastItems.Remove(item);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
