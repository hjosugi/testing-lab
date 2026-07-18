# PHP 8.4: PHPUnit 13 and Infection

```bash
composer install --no-interaction
composer test
composer mutation
```

PHPUnit 13.2.4とInfection 0.34.0を`composer.lock`でtransitive dependencyまで固定しています。Infectionはcoverage driverとしてPCOV、Xdebug、phpdbgのいずれかが必要です。
