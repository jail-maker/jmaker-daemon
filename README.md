# jmaker-server

[![asciicast](https://asciinema.org/a/151534.png)](https://asciinema.org/a/151534)

## requirements:

- FreeBSD >= 11.1
- redis
- rsync
- node >= 9.1
- `npm` or `yarn`
- [check_ip](https://github.com/jail-maker/check_ip) -
for automatically getting ip addresses

tune in /boot/loader.conf:
```
kern.racct.enable=1
```

tune in /etc/rc.conf:
```
redis_enable="YES"

# recommendations:
sendmail_enable="NO"
rpcbind_enable="NO"
```

## install:
1. clone and change directory project
2. install dependencies `$ yarn`
3. run `$ sudo ./index.js --config=config.yml`
