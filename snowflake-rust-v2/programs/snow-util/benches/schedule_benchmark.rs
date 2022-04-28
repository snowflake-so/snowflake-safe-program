use criterion::{black_box, criterion_group, criterion_main, Criterion};
use snow_util::scheduler::SnowSchedule;
use snow_util::scheduler::SnowTime;

fn criterion_benchmark(c: &mut Criterion) {
    c.bench_function("run run", |b| {
        b.iter(|| {
            let cron = SnowSchedule::parse(black_box("0 12 17 2 6")).unwrap();
            let _next_execution = cron
                .next_event(&SnowTime::from_time_ts(black_box(1638148600)))
                .unwrap();
        });
    });
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
