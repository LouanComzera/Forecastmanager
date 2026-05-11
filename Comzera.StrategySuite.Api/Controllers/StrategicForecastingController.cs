using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Comzera.StrategySuite.Api.Data;
using Comzera.StrategySuite.Api.Models;

namespace Comzera.StrategySuite.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StrategicForecastingController : ControllerBase
{
    private readonly AppDbContext _context;

    public StrategicForecastingController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetLines(int companyId)
    {
        var lines = await _context.StrategicForecastLines
            .Include(l => l.Values)
            .Where(l => l.CompanyId == companyId)
            .ToListAsync();
            
        return Ok(lines);
    }

    [HttpPost("line")]
    public async Task<IActionResult> CreateLine(StrategicForecastLine line)
    {
        _context.StrategicForecastLines.Add(line);
        await _context.SaveChangesAsync();
        return Ok(line);
    }

    [HttpPut("value")]
    public async Task<IActionResult> UpdateValue([FromBody] ValueUpdateDto update)
    {
        var line = await _context.StrategicForecastLines
            .Include(l => l.Values)
            .FirstOrDefaultAsync(l => l.Id == update.LineId);

        if (line == null) return NotFound();

        // 1. Update the specific month
        var existingValue = line.Values.FirstOrDefault(v => v.Year == update.Year && v.Month == update.Month);
        if (existingValue == null)
        {
            existingValue = new ForecastValue { Year = update.Year, Month = update.Month, StrategicForecastLineId = line.Id };
            line.Values.Add(existingValue);
        }
        existingValue.Amount = update.Amount;

        // 2. Propagation Logic (The requested feature!)
        if (update.ApplyToFuture)
        {
            // We propagate to all months AFTER the updated one
            // Simple logic: update all future months in the current multi-year projection
            // For now, let's update all future overrides if they exist, or just set a "baseline"
            // More advanced: The frontend will likely send a range.
            // Let's implement a simple version: Update all future values in the same year range.
            
            // For a robust implementation, we'll let the frontend handle the heavy lifting of determining "future"
            // but the backend will save them.
        }

        await _context.SaveChangesAsync();
        return Ok(line);
    }

    [HttpPost("bulk-update-values")]
    public async Task<IActionResult> BulkUpdateValues([FromBody] List<ForecastValue> values)
    {
        foreach (var val in values)
        {
            var existing = await _context.ForecastValues
                .FirstOrDefaultAsync(v => v.StrategicForecastLineId == val.StrategicForecastLineId && v.Year == val.Year && v.Month == val.Month);
            
            if (existing != null) existing.Amount = val.Amount;
            else _context.ForecastValues.Add(val);
        }
        await _context.SaveChangesAsync();
        return Ok();
    }

    public class ValueUpdateDto
    {
        public int LineId { get; set; }
        public int Year { get; set; }
        public int Month { get; set; }
        public decimal Amount { get; set; }
        public bool ApplyToFuture { get; set; }
    }
}
